
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { userFollowersChunkGqlByUsername, userFollowingChunkGqlByUsername, mediaLikersBulkV1, getUserPosts, extractCommentersBulkV2, extractHashtagClipsBulkV2, userByUsernameV1, getFollowersPage, getFollowingPage, extractFilteredUsers, mediaByUrlV1, getCommentsPage, getUserMediasPage, getHashtagClipsPage, UserDetails } from '../../../../services/hikerApi';
import { COIN_RULES, deductCoins } from '../../../../utils/coinLogic';

console.log('[Process API] Loaded process route');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  console.log('[Process API] --- Handler Entry ---');
  console.log('[Process API] POST /api/extractions/process called');
  // Maintenance guard: short-circuit if MAINTENANCE_MODE is enabled

  if (process.env.MAINTENANCE_MODE === 'true') {
    console.warn('[Process API] Maintenance mode active, exiting early');
    return NextResponse.json({ message: 'Maintenance mode active' }, { status: 200 });
  }
  // Security: Check for Supabase webhook secret
  const supabaseSecret = req.headers.get('x-supabase-signature');
  if (!supabaseSecret || supabaseSecret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    console.warn('[Process API] Unauthorized: Invalid or missing x-supabase-signature');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse the webhook payload (Supabase sends { record: { ...row } })
  let payload;
  try {
    payload = await req.json();
    console.log('[Process API] Received payload:', JSON.stringify(payload));
  } catch (e) {
    console.error('[Process API] Invalid JSON payload', e);
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
  let job = payload.record;
  console.log('[Process API] Job record:', job);
  if (!job) {
    console.warn('[Process API] No job record in payload');
    return NextResponse.json({ error: 'No job record in payload' }, { status: 400 });
  }

  // Re-fetch current job row to ensure fresh state and use optimistic locking
  console.log('[Process API] Fetching current job row from DB...');
  const { data: currentJob, error: fetchErr } = await supabase
    .from('extractions')
    .select('*')
    .eq('id', job.id)
    .single();

  if (fetchErr || !currentJob) {
    console.warn('[Process API] Could not fetch job row', fetchErr?.message);
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }
  console.log('[Process API] Current job:', currentJob);

  if (!['pending', 'running'].includes(currentJob.status)) {
    console.warn('[Process API] Job not in runnable state:', currentJob.status);
    return NextResponse.json({ message: 'Job not in runnable state', status: currentJob.status });
  }

  // Check if lock is held by another worker (not self-chaining)
  if (currentJob.locked_by) {
    // Check if this is a self-chaining call by looking at the request body
    const isSelfChain = payload.record && payload.record.id === currentJob.id;
    if (isSelfChain) {
      console.log('[Process API] Self-chaining call detected, continuing with existing lock:', currentJob.locked_by);
      // Continue processing with existing lock
    } else {
      console.warn('[Process API] Lock held by another worker:', currentJob.locked_by);
    return NextResponse.json({ message: 'Lock held by another worker' });
    }
  }

  let workerId: string;
  let lockAcquired = false;

  if (currentJob.locked_by) {
    // Self-chaining: use existing lock
    workerId = currentJob.locked_by;
    console.log('[Process API] Using existing lock for self-chaining:', workerId);
    lockAcquired = true;
  } else {
    // New extraction: acquire lock
    workerId = crypto.randomUUID();
  console.log('[Process API] Acquiring lock for worker:', workerId);
  const currentVersion = typeof currentJob.version === 'number' ? currentJob.version : 0;
  const { error: lockErr, data: lockRows } = await supabase
    .from('extractions')
    .update({
      locked_by: workerId,
      status: 'running',
      version: currentVersion + 1,
    })
    .eq('id', job.id)
    .eq('version', currentVersion)
    .select('id');

  if (lockErr) {
    console.warn('[Process API] Lock acquire failed', lockErr.message);
    return NextResponse.json({ message: 'Could not acquire lock' }, { status: 200 });
  }
  if (!lockRows || lockRows.length === 0) {
    console.warn('[Process API] Lock already acquired elsewhere');
    return NextResponse.json({ message: 'Lock already acquired elsewhere' }, { status: 200 });
    }
    lockAcquired = true;
  }

  // Use the fresh row for processing
  job = currentJob;
  console.log('[Process API] Using fresh job row for processing');

  // Step 1: early-exit on cancel and increment attempts (we own the lock now)
  if (job.cancel_requested === true) {
    console.warn('[Process API] Cancel requested for job, exiting:', job.id);
    await supabase
      .from('extractions')
      .update({ status: 'cancelled', locked_by: null })
      .eq('id', job.id)
      .eq('locked_by', workerId);
    return NextResponse.json({ message: 'Job cancelled' }, { status: 200 });
  }
  // attempts++ for observability and runaway protection
  const currentAttempts = (typeof job.attempts === 'number' ? job.attempts : 0) + 1;
  const MAX_ATTEMPTS = 10; // Cap attempts to prevent infinite loops
  
  if (currentAttempts > MAX_ATTEMPTS) {
    console.error('[Process API] Job exceeded max attempts, marking as failed:', job.id, 'attempts:', currentAttempts);
    await supabase
      .from('extractions')
      .update({ 
        status: 'failed', 
        error_message: `Job exceeded maximum attempts (${MAX_ATTEMPTS})`,
        locked_by: null
      })
      .eq('id', job.id)
      .eq('locked_by', workerId);
    return NextResponse.json({ error: 'Job exceeded maximum attempts' }, { status: 500 });
  }
  
  try {
    await supabase
      .from('extractions')
      //.update({ attempts: (typeof job.attempts === 'number' ? job.attempts : 0) + 1 })
      .update({ attempts: currentAttempts })
      .eq('id', job.id)
      .eq('locked_by', workerId);
  } catch (e) {
    console.warn('[Process API] Failed to increment attempts for job:', job.id, e);
  }

  let updateFields: Record<string, unknown> = {};
  try {
    // Parse filters and targets
    let parsedFilters = job.filters;
    if (typeof parsedFilters === 'string') {
      try { parsedFilters = JSON.parse(parsedFilters); } catch {}
    }
    const targets = typeof job.target_usernames === 'string' ? job.target_usernames.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

    // Progress updater
    let progressCount = job.progress || 0;
    const updateProgress = (count: number) => {
      progressCount = count;
    };

    let extractionResult;
    console.log('[Process API] Processing job:', job.id, 'type:', job.extraction_type);
  console.log('[Process API] Extraction type:', job.extraction_type);
  switch (job.extraction_type) {
      case 'followers': {
        console.log('[Process API] Starting followers extraction');
        // Initialize or load batching state from current_step
        const usernames = targets.length ? targets : (job.target_usernames ? String(job.target_usernames).split(',').map((s:string)=>s.trim()).filter(Boolean) : []);
        console.log('[Process API] Followers usernames:', usernames);
        if (usernames.length === 0) throw new Error('No usernames provided');

        interface Step {
          idx: number;
          page_id?: string;
          targets: { username: string; pk: string; total: number }[];
          totalEstimated?: number;
        }
        let step: Step = { idx: 0, targets: [] };
        console.log('[Process API] Followers step:', step);
        try {
          step = job.current_step ? JSON.parse(job.current_step) : { idx: 0, targets: [] };
        } catch {}

        // Fix: resolve targets if not an array or if empty
        if (!Array.isArray(step.targets) || step.targets.length === 0) {
          console.log('[Process API] Resolving follower targets...');
          const resolvedTargets = [] as { username: string; pk: string; total: number }[];
          let totalEstimated = 0;
          for (const uname of usernames) {
            const clean = uname.replace(/^@/, '');
            //console.log(`[Process API] Resolving username: ${uname} (clean: ${clean})`);
            let user;
            try {
              user = await userByUsernameV1(clean);
              //console.log(`[Process API] userByUsernameV1 result for ${clean}:`, user);
            } catch (err) {
              // If error is 403 or 404, skip and continue
              if (err && typeof err === 'object' && 'response' in err) {
                const response = (err as { response?: { status?: number } }).response;
                if (response && (response.status === 404 || response.status === 403)) {
                  console.warn(`[Process API] Skipping username due to ${response.status} error: ${clean}`);
                  continue;
                }
              }
              console.error(`[Process API] Error in userByUsernameV1 for ${clean}:`, err);
            }
            if (user?.pk) {
              const total = typeof user.follower_count === 'number' ? user.follower_count : 0;
              totalEstimated += total;
              resolvedTargets.push({ username: clean, pk: user.pk, total });
              console.log(`[Process API] Resolved target:`, { username: clean, pk: user.pk, total });
            } else {
              console.warn(`[Process API] Could not resolve user for username: ${clean}`);
            }
          }
          step = { idx: 0, page_id: undefined, targets: resolvedTargets, totalEstimated };
          console.log('[Process API] Final resolvedTargets:', resolvedTargets, 'totalEstimated:', totalEstimated);
          await supabase.from('extractions').update({ current_step: JSON.stringify(step) }).eq('id', job.id).eq('locked_by', workerId);
        }

        if (!step.targets.length || step.idx >= step.targets.length) {
          console.log('[Process API] No followers to process, finishing.');
          extractionResult = { filteredFollowers: [], actualCoinCost: 0 } as { filteredFollowers: unknown[]; actualCoinCost: number };
          break;
        }

        const active = step.targets[step.idx];
        console.log('[Process API] Processing follower target:', active);
        console.log('[Process API] Fetching followers page for pk:', active.pk, 'page_id:', step.page_id);
        const page = await getFollowersPage(active.pk, step.page_id);
        const pageUsers = page.items || [];

        // Coin limit calculation based on remaining budget BEFORE filtering
        const coinLimitRaw = (parsedFilters?.followers?.coinLimit ?? parsedFilters?.coinLimit) as number | string | undefined;
        const coinLimit = coinLimitRaw !== undefined ? Math.floor(Number(coinLimitRaw)) : undefined;
        const perUserTotalFollowers = (COIN_RULES.followers.perChunk.coins / COIN_RULES.followers.perChunk.users) + COIN_RULES.followers.perUser;

        const { data: balanceRow, error: balanceErr } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
        if (balanceErr || typeof balanceRow?.coins !== 'number') throw new Error('Could not fetch user coins');
        const userCoins = balanceRow.coins;
        const coinsSpent = typeof job.coins_spent === 'number' ? job.coins_spent : 0;
        const remainingByLimit = coinLimit !== undefined ? Math.max(0, coinLimit - coinsSpent) : Number.POSITIVE_INFINITY;
        const maxUsersByLimit = Math.floor(remainingByLimit / perUserTotalFollowers);
        const maxUsersByBalance = Math.floor(userCoins / perUserTotalFollowers);
        const allowedRawUsers = Math.max(0, Math.min(pageUsers.length, maxUsersByLimit, maxUsersByBalance));

        // Cap the raw users list by allowed users before filtering to avoid overspending
        const rawUsers = pageUsers.slice(0, allowedRawUsers);
        console.log('[Process API] Followers cap before filtering:', { pageUsers: pageUsers.length, allowedRawUsers, coinLimit, coinsSpent, userCoins });

        type FilterObject = Record<string, unknown>;
        console.log('[Process API] Filtering users...');
        const filteredUsers = await extractFilteredUsers(
          rawUsers.map(u => ({ username: u.username })),
          (parsedFilters?.followers || parsedFilters || {}) as FilterObject,
          async (username: string): Promise<UserDetails> => {
            const d = await userByUsernameV1(username);
            return d as UserDetails;
          }
        );

        // Calculate cost based on capped rawUsers (before filtering)
        const batchExtractionCost = Math.ceil((rawUsers.length || 0) / COIN_RULES.followers.perChunk.users) * COIN_RULES.followers.perChunk.coins;
        const batchFilteringCost = (rawUsers.length || 0) * COIN_RULES.followers.perUser;
        const batchCost = batchExtractionCost + batchFilteringCost;

        // Check coin limit (using coins_spent) and spend coins atomically before filtering
        if (rawUsers.length > 0) {
          const { data: userData, error: userErr } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
          if (userErr || typeof userData?.coins !== 'number') throw new Error('Could not fetch user coins');
          if (userData.coins < batchCost) throw new Error('insufficient_coins');

          const coinsSpent = typeof job.coins_spent === 'number' ? job.coins_spent : 0;
        if (coinLimit !== undefined) {
            const remaining = Math.max(0, coinLimit - coinsSpent);
            console.log('[Process API] Coin limit check (followers):', { coinLimit, coinsSpent, remaining, batchCost });
            if (batchCost > remaining) {
              console.log('[Process API] Coin limit reached for followers; stopping before processing batch');
              updateFields = {
                page_count: (job.page_count || 0) + 1,
                progress: (job.progress || 0) + 0,
                status: 'completed',
                completed_at: new Date().toISOString(),
                error_message: null,
                next_page_id: null,
                current_step: JSON.stringify(step),
                locked_by: null,
              };
              await supabase.from('extractions').update(updateFields).eq('id', job.id).eq('locked_by', workerId);
              return NextResponse.json({ message: 'Coin limit reached', jobId: job.id, ...updateFields });
            }
          }

          console.log('[Process API] Spending coins (followers) via RPC:', batchCost);
          const { error: spendErr } = await supabase.rpc('spend_extraction_coins', {
            p_user_id: job.user_id,
            p_extraction_id: job.id,
            p_amount: batchCost,
          });
          if (spendErr) throw new Error(spendErr.message);
          // refresh coins_spent locally for logging/decisions
          job.coins_spent = (typeof job.coins_spent === 'number' ? job.coins_spent : 0) + batchCost;
        }

        // Apply filters after coin deduction
        // Note: maxUsersWithinCoinLimit logic removed since we check coin limit before processing

        // Insert filtered users to database
        console.log('[Process API] Filtering results:', { 
          totalUsers: pageUsers.length, 
          filteredUsers: filteredUsers.length 
        });
        
        if (filteredUsers.length > 0) {
          console.log('[Process API] Inserting filtered users to DB:', filteredUsers.length);
          const rows = filteredUsers.map(u => ({
            extraction_id: job.id,
            pk: u.pk || null,
            username: u.username,
            full_name: u.full_name,
            profile_pic_url: u.profile_pic_url,
            is_private: u.is_private,
            is_verified: u.is_verified,
            email: u.email ?? null,
            phone: u.phone ?? null,
            link_in_bio: u.link_in_bio ?? null,
            is_business: typeof u.is_business === 'boolean' ? u.is_business : null,
          }));
          const { error: insertErr } = await supabase.from('extracted_users').insert(rows);
          if (insertErr) throw new Error(insertErr.message);
        }

        // Advance cursor
        let next_page_id = page.next_page_id;
        if (next_page_id && step.page_id && next_page_id === step.page_id) {
          console.warn('[Process API] Duplicate next_page_id detected for followers; stopping pagination for this target:', next_page_id);
          next_page_id = undefined;
        }
        if (next_page_id) {
          console.log('[Process API] Advancing to next page:', next_page_id);
          step.page_id = next_page_id;
        } else {
          step.idx += 1;
          step.page_id = undefined;
        }

        // Update state and decide chaining
        const hasMore = (step.idx < step.targets.length) || !!step.page_id;
        console.log('[Process API] hasMore:', hasMore);
              updateFields = {
                page_count: (job.page_count || 0) + 1,
                progress: (job.progress || 0) + filteredUsers.length,
                status: hasMore ? 'running' : 'completed',
                completed_at: hasMore ? null : new Date().toISOString(),
                error_message: null,
                next_page_id: step.page_id || null,
                current_step: JSON.stringify(step),
                locked_by: hasMore ? workerId : null,
              };

        console.log('[Process API] Updating extraction row for followers...');
        const { error: updateErrorFollowers } = await supabase
                .from('extractions')
                .update(updateFields)
                .eq('id', job.id)
                .eq('locked_by', workerId);
        if (updateErrorFollowers) throw new Error(updateErrorFollowers.message);
        console.log('[Process API] Followers batch processed');

              // Chain next
              if (hasMore) {
                console.log('[Process API] Chaining next followers batch...');
                await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/extractions/process`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-supabase-signature': process.env.SUPABASE_WEBHOOK_SECRET || '' },
                  body: JSON.stringify({ record: { id: job.id } }),
                });
              }

        console.log('[Process API] Followers extraction complete');
        return NextResponse.json({ message: 'Followers batch processed', jobId: job.id, ...updateFields });
      }
        
        
        break;
      case 'following': {
        console.log('[Process API] Starting following extraction');
  const usernames = targets.length ? targets : (job.target_usernames ? String(job.target_usernames).split(',').map((s:string)=>s.trim()).filter(Boolean) : []);
  console.log('[Process API] Following usernames:', usernames);
        if (usernames.length === 0) throw new Error('No usernames provided');

        interface StepFollowing {
          idx: number;
          page_id?: string;
          targets: { username: string; pk: string; total: number }[];
          totalEstimated?: number;
        }
  let step: StepFollowing = { idx: 0, targets: [] };
  console.log('[Process API] Following step:', step);
        try {
          step = job.current_step ? JSON.parse(job.current_step) : { idx: 0, targets: [] };
        } catch {}

        if (!Array.isArray(step.targets)) {
          console.log('[Process API] Resolving following targets...');
          const resolvedTargets = [] as { username: string; pk: string; total: number }[];
          let totalEstimated = 0;
          for (const uname of usernames) {
            const clean = uname.replace(/^@/, '');
            const user = await userByUsernameV1(clean);
            if (user?.pk) {
              const total = typeof user.following_count === 'number' ? user.following_count : 0;
              totalEstimated += total;
              resolvedTargets.push({ username: clean, pk: user.pk, total });
            }
          }
          step = { idx: 0, page_id: undefined, targets: resolvedTargets, totalEstimated };
          await supabase.from('extractions').update({ current_step: JSON.stringify(step) }).eq('id', job.id).eq('locked_by', workerId);
        }

        if (!step.targets.length || step.idx >= step.targets.length) {
          console.log('[Process API] No followings to process, finishing.');
          extractionResult = { filteredFollowings: [], actualCoinCost: 0 } as { filteredFollowings: unknown[]; actualCoinCost: number };
          break;
        }

  const active = step.targets[step.idx];
  console.log('[Process API] Processing following target:', active);
  console.log('[Process API] Fetching following page for pk:', active.pk, 'page_id:', step.page_id);
  const page = await getFollowingPage(active.pk, step.page_id);
        const pageUsers = page.items || [];

        // Coin limit calculation based on remaining budget BEFORE filtering
        const coinLimitRaw = (parsedFilters?.following?.coinLimit ?? parsedFilters?.coinLimit) as number | string | undefined;
        const coinLimit = coinLimitRaw !== undefined ? Math.floor(Number(coinLimitRaw)) : undefined;
        const perUserTotalFollowing = (COIN_RULES.followings.perChunk.coins / COIN_RULES.followings.perChunk.users) + COIN_RULES.followings.perUser;
        const { data: balF, error: balErrF } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
        if (balErrF || typeof balF?.coins !== 'number') throw new Error('Could not fetch user coins');
        const userCoinsF = balF.coins;
        const coinsSpentF = typeof job.coins_spent === 'number' ? job.coins_spent : 0;
        const remainingByLimitF = coinLimit !== undefined ? Math.max(0, coinLimit - coinsSpentF) : Number.POSITIVE_INFINITY;
        const maxUsersByLimitF = Math.floor(remainingByLimitF / perUserTotalFollowing);
        const maxUsersByBalanceF = Math.floor(userCoinsF / perUserTotalFollowing);
        const allowedRawUsersF = Math.max(0, Math.min(pageUsers.length, maxUsersByLimitF, maxUsersByBalanceF));
        const rawUsersF = pageUsers.slice(0, allowedRawUsersF);
        console.log('[Process API] Following cap before filtering:', { pageUsers: pageUsers.length, allowedRawUsers: allowedRawUsersF, coinLimit, coinsSpent: coinsSpentF, userCoins: userCoinsF });

        type FilterObject = Record<string, unknown>;
  console.log('[Process API] Filtering users...');
  const filteredUsers = await extractFilteredUsers(
          rawUsersF.map(u => ({ username: u.username })),
          (parsedFilters?.following || parsedFilters || {}) as FilterObject,
          async (username: string): Promise<UserDetails> => {
            const d = await userByUsernameV1(username);
            return d as UserDetails;
          }
        );

        // Calculate cost based on capped rawUsersF (before filtering)
        const batchExtractionCost = Math.ceil((rawUsersF.length || 0) / COIN_RULES.followings.perChunk.users) * COIN_RULES.followings.perChunk.coins;
        const batchFilteringCost = (rawUsersF.length || 0) * COIN_RULES.followings.perUser;
        const batchCost = batchExtractionCost + batchFilteringCost;

        // Check coin limit (using coins_spent) and spend coins atomically before filtering
        if (rawUsersF.length > 0) {
          const { data: userData, error: userErr } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
          if (userErr || typeof userData?.coins !== 'number') throw new Error('Could not fetch user coins');
          if (userData.coins < batchCost) throw new Error('insufficient_coins');
          
          const coinsSpent = typeof job.coins_spent === 'number' ? job.coins_spent : 0;
        if (coinLimit !== undefined) {
            const remaining = Math.max(0, coinLimit - coinsSpent);
            console.log('[Process API] Coin limit check (following):', { coinLimit, coinsSpent, remaining, batchCost });
            if (batchCost > remaining) {
              console.log('[Process API] Coin limit reached for following; stopping before processing batch');
              const updateFollowingStop = {
                page_count: (job.page_count || 0) + 1,
                progress: (job.progress || 0) + 0,
                status: 'completed',
                completed_at: new Date().toISOString(),
                error_message: null,
                next_page_id: null,
                current_step: JSON.stringify(step),
                locked_by: null,
              } as Record<string, unknown>;
              await supabase.from('extractions').update(updateFollowingStop).eq('id', job.id).eq('locked_by', workerId);
              return NextResponse.json({ message: 'Coin limit reached', jobId: job.id, ...updateFollowingStop });
            }
          }

          console.log('[Process API] Spending coins (following) via RPC:', batchCost);
          const { error: spendErrF } = await supabase.rpc('spend_extraction_coins', {
            p_user_id: job.user_id,
            p_extraction_id: job.id,
            p_amount: batchCost,
          });
          if (spendErrF) throw new Error(spendErrF.message);
          job.coins_spent = (typeof job.coins_spent === 'number' ? job.coins_spent : 0) + batchCost;
        }

        // Insert filtered users to database
        if (filteredUsers.length > 0) {
          console.log('[Process API] Inserting filtered users to DB:', filteredUsers.length);
          const rows = filteredUsers.map(u => ({
            extraction_id: job.id,
            pk: u.pk || null,
            username: u.username,
            full_name: u.full_name,
            profile_pic_url: u.profile_pic_url,
            is_private: u.is_private,
            is_verified: u.is_verified,
            email: u.email ?? null,
            phone: u.phone ?? null,
            link_in_bio: u.link_in_bio ?? null,
            is_business: typeof u.is_business === 'boolean' ? u.is_business : null,
          }));
          const { error: insertErr } = await supabase.from('extracted_users').insert(rows);
          if (insertErr) throw new Error(insertErr.message);
        }

        let next_page_id = page.next_page_id;
        if (next_page_id && step.page_id && next_page_id === step.page_id) {
          console.warn('[Process API] Duplicate next_page_id detected for following; stopping pagination for this target:', next_page_id);
          next_page_id = undefined;
        }
        if (next_page_id) {
          console.log('[Process API] Advancing to next page:', next_page_id);
          step.page_id = next_page_id;
        } else {
          step.idx += 1;
          step.page_id = undefined;
        }

        {
    const hasMore = (step.idx < step.targets.length) || !!step.page_id;
    console.log('[Process API] hasMore:', hasMore);
          const updateFollowing = {
            page_count: (job.page_count || 0) + 1,
            progress: (job.progress || 0) + filteredUsers.length,
            status: hasMore ? 'running' : 'completed',
            completed_at: hasMore ? null : new Date().toISOString(),
            error_message: null,
            next_page_id: step.page_id || null,
            current_step: JSON.stringify(step),
            locked_by: hasMore ? workerId : null,
          } as Record<string, unknown>;
    console.log('[Process API] Updating extraction row for followings...');
    const { error: updateErrorF } = await supabase
            .from('extractions')
            .update(updateFollowing)
            .eq('id', job.id)
            .eq('locked_by', workerId);
    if (updateErrorF) throw new Error(updateErrorF.message);
    console.log('[Process API] Following batch processed');

          if (hasMore) {
            console.log('[Process API] Chaining next following batch...');
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/extractions/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-supabase-signature': process.env.SUPABASE_WEBHOOK_SECRET || '' },
              body: JSON.stringify({ record: { id: job.id } }),
            });
          }
    console.log('[Process API] Following extraction complete');
    return NextResponse.json({ message: 'Following batch processed', jobId: job.id, ...updateFollowing });
        }
      }
        break;
      case 'likers': {
        console.log('[Process API] Starting likers extraction');
  const urlStr = job.target_usernames || '';
  console.log('[Process API] Likers URLs:', urlStr);
        const urls = String(urlStr).split(',').map((u: string) => u.trim()).filter(Boolean);
        if (urls.length === 0) throw new Error('No URLs provided');

        interface StepLikers {
          idx: number;
          page_id?: string;
          targets: { url: string; mediaId: string }[];
        }
  let step: StepLikers = { idx: 0, targets: [] };
  console.log('[Process API] Likers step:', step);
        try {
          step = job.current_step ? JSON.parse(job.current_step) : { idx: 0, targets: [] };
        } catch {}
        if (!Array.isArray(step.targets)) {
          console.log('[Process API] Resolving likers targets...');
          const resolved: { url: string; mediaId: string }[] = [];
          for (const url of urls) {
            try { const media = await mediaByUrlV1(url); if (media?.id) resolved.push({ url, mediaId: media.id }); } catch {}
          }
          if (!resolved.length) throw new Error('No valid media IDs');
          step = { idx: 0, targets: resolved };
          await supabase.from('extractions').update({ current_step: JSON.stringify(step) }).eq('id', job.id).eq('locked_by', workerId);
        }
        if (!step.targets.length || step.idx >= step.targets.length) {
          console.log('[Process API] No likers to process, finishing.');
          return NextResponse.json({ message: 'No likers to process', jobId: job.id });
        }
  const active = step.targets[step.idx];
  console.log('[Process API] Processing likers target:', active);
        // For likers endpoint, no pagination page_id (single list). Process per-URL per batch.
  console.log('[Process API] Fetching likers for URL:', active.url);
  const res = await mediaLikersBulkV1({ urls: [active.url], filters: parsedFilters || {}, user_id: job.user_id, skipCoinCheck: true }, updateProgress, undefined, job.id, supabase);
  const likers = (res as { filteredLikers?: UserDetails[] })?.filteredLikers || [];

        // Cap by remaining coin limit and balance BEFORE spending
        const coinLimitRaw = (parsedFilters?.coinLimit) as number | string | undefined;
        const coinLimit = coinLimitRaw !== undefined ? Math.floor(Number(coinLimitRaw)) : undefined;
        const perChunkUsers = COIN_RULES.likers.perChunk.users;
        const perChunkCoins = COIN_RULES.likers.perChunk.coins;
        const perUserDetail = COIN_RULES.likers.perUser;
        const perUserTotalLikers = perUserDetail + (perChunkCoins / perChunkUsers);
        const { data: balL, error: balErrL } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
        if (balErrL || typeof balL?.coins !== 'number') throw new Error('Could not fetch user coins');
        const userCoinsL = balL.coins;
        const coinsSpentL = typeof job.coins_spent === 'number' ? job.coins_spent : 0;
        const remainingByLimitL = coinLimit !== undefined ? Math.max(0, coinLimit - coinsSpentL) : Number.POSITIVE_INFINITY;
        const maxUsersByLimitL = Math.floor(remainingByLimitL / perUserTotalLikers);
        const maxUsersByBalanceL = Math.floor(userCoinsL / perUserTotalLikers);
        const allowedRawLikers = Math.max(0, Math.min(likers.length, maxUsersByLimitL, maxUsersByBalanceL));
        const rawLikers = likers.slice(0, allowedRawLikers);
        console.log('[Process API] Likers cap before spending:', { likers: likers.length, allowedRawLikers, coinsSpent: coinsSpentL, userCoins: userCoinsL });

        // Calculate cost based on raw likers (before filtering)
        const batchCost = Math.ceil((rawLikers.length || 0) / perChunkUsers) * perChunkCoins + (rawLikers.length * perUserDetail);

        // Check coin limit (using coins_spent) and spend coins atomically
        if (rawLikers.length > 0) {
          const { data: userData, error: userErr } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
          if (userErr || typeof userData?.coins !== 'number') throw new Error('Could not fetch user coins');
          if (userData.coins < batchCost) throw new Error('insufficient_coins');
          
          const coinsSpent = typeof job.coins_spent === 'number' ? job.coins_spent : 0;
          if (coinLimit !== undefined) {
            const remaining = Math.max(0, coinLimit - coinsSpent);
            console.log('[Process API] Coin limit check (likers):', { coinLimit, coinsSpent, remaining, batchCost });
            if (batchCost > remaining) {
              console.log('[Process API] Coin limit reached for likers; stopping before processing batch');
              const updStop = {
                page_count: (job.page_count || 0) + 1,
                progress: (job.progress || 0) + 0,
                status: 'completed',
                completed_at: new Date().toISOString(),
                error_message: null,
                next_page_id: null,
                current_step: JSON.stringify(step),
                locked_by: null,
              } as Record<string, unknown>;
              await supabase.from('extractions').update(updStop).eq('id', job.id).eq('locked_by', workerId);
              return NextResponse.json({ message: 'Coin limit reached', jobId: job.id, ...updStop });
            }
          }

          console.log('[Process API] Spending coins (likers) via RPC:', batchCost);
          const { error: spendErrL } = await supabase.rpc('spend_extraction_coins', {
            p_user_id: job.user_id,
            p_extraction_id: job.id,
            p_amount: batchCost,
          });
          if (spendErrL) throw new Error(spendErrL.message);
          job.coins_spent = (typeof job.coins_spent === 'number' ? job.coins_spent : 0) + batchCost;
        }

        // Process all likers (no additional filtering needed for likers)
        const toProcess = rawLikers;

  const rows = toProcess.map((u: UserDetails) => ({
            extraction_id: job.id,
            pk: u.pk || null,
            username: u.username,
            full_name: u.full_name,
            profile_pic_url: u.profile_pic_url,
            is_private: u.is_private,
            is_verified: u.is_verified,
            email: u.public_email ?? null,
            phone: u.public_phone_number ?? null,
            link_in_bio: u.link_in_bio ?? null,
            is_business: typeof u.is_business === 'boolean' ? u.is_business : null,
          }));
        if (rows.length > 0) {
          console.log('[Process API] Inserting likers to DB:', rows.length);
          const { error: insErr } = await supabase.from('extracted_users').insert(rows);
          if (insErr) throw new Error(insErr.message);
        }
  step.idx += 1;
  console.log('[Process API] Advancing to next likers target');
        {
    const hasMore = step.idx < step.targets.length;
    console.log('[Process API] hasMore:', hasMore);
          const upd = {
            page_count: (job.page_count || 0) + 1,
            progress: (job.progress || 0) + rows.length,
            status: hasMore ? 'running' : 'completed',
            completed_at: hasMore ? null : new Date().toISOString(),
            error_message: null,
            next_page_id: null,
            current_step: JSON.stringify(step),
            locked_by: hasMore ? workerId : null,
          } as Record<string, unknown>;
    console.log('[Process API] Updating extraction row for likers...');
    const { error: upErr } = await supabase.from('extractions').update(upd).eq('id', job.id).eq('locked_by', workerId);
    if (upErr) throw new Error(upErr.message);
    console.log('[Process API] Likers batch processed');
          if (hasMore) {
            console.log('[Process API] Chaining next likers batch...');
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/extractions/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-supabase-signature': process.env.SUPABASE_WEBHOOK_SECRET || '' },
              body: JSON.stringify({ record: { id: job.id } }),
            });
          }
    console.log('[Process API] Likers extraction complete');
    return NextResponse.json({ message: 'Likers batch processed', jobId: job.id, ...upd });
        }
      }
        break;
      case 'posts': {
        console.log('[Process API] Starting posts extraction');
  const usernames = targets.length ? targets : (job.target_usernames ? String(job.target_usernames).split(',').map((s:string)=>s.trim()).filter(Boolean) : []);
  console.log('[Process API] Posts usernames:', usernames);
        if (usernames.length === 0) throw new Error('No usernames provided');

        interface StepPosts {
          idx: number;
          page_id?: string;
          targets: { username: string; pk: string; total: number }[];
          totalEstimated?: number;
        }
  let step: StepPosts = { idx: 0, targets: [] };
  console.log('[Process API] Posts step:', step);
        try {
          step = job.current_step ? JSON.parse(job.current_step) : { idx: 0, targets: [] };
        } catch {}
        if (!Array.isArray(step.targets)) {
          console.log('[Process API] Resolving posts targets...');
          const resolvedTargets = [] as { username: string; pk: string; total: number }[];
          let totalEstimated = 0;
          for (const uname of usernames) {
            const clean = uname.replace(/^@/, '');
            const user = await userByUsernameV1(clean);
            if (user?.pk) {
              const total = typeof user.media_count === 'number' ? user.media_count : 0;
              totalEstimated += total;
              resolvedTargets.push({ username: clean, pk: user.pk, total });
            }
          }
          step = { idx: 0, page_id: undefined, targets: resolvedTargets, totalEstimated };
          await supabase.from('extractions').update({ current_step: JSON.stringify(step) }).eq('id', job.id).eq('locked_by', workerId);
        }
        if (!step.targets.length || step.idx >= step.targets.length) {
          console.log('[Process API] No posts to process, finishing.');
          return NextResponse.json({ message: 'No posts to process', jobId: job.id });
        }

  const active = step.targets[step.idx];
  console.log('[Process API] Processing posts target:', active);
  console.log('[Process API] Fetching user medias page for pk:', active.pk, 'page_id:', step.page_id);
  const page = await getUserMediasPage(active.pk, step.page_id);
        const medias = page.items || [];

        // Cap by remaining coin limit and balance BEFORE spending (posts)
        const perPost = COIN_RULES.posts.perPost;
        const coinLimitRawP = (parsedFilters?.posts?.coinLimit ?? parsedFilters?.coinLimit) as number | string | undefined;
        const coinLimitP = coinLimitRawP !== undefined ? Math.floor(Number(coinLimitRawP)) : undefined;
        const { data: balP, error: balErrP } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
        if (balErrP || typeof balP?.coins !== 'number') throw new Error('Could not fetch user coins');
        const userCoinsP = balP.coins;
        const coinsSpentP = typeof job.coins_spent === 'number' ? job.coins_spent : 0;
        const remainingByLimitP = coinLimitP !== undefined ? Math.max(0, coinLimitP - coinsSpentP) : Number.POSITIVE_INFINITY;
        const maxPostsByLimit = Math.floor(remainingByLimitP / perPost);
        const maxPostsByBalance = Math.floor(userCoinsP / perPost);
        const allowedRawPosts = Math.max(0, Math.min(medias.length, maxPostsByLimit, maxPostsByBalance));
        const rawMedias = medias.slice(0, allowedRawPosts);
        console.log('[Process API] Posts cap before spending:', { medias: medias.length, allowedRawPosts, coinsSpent: coinsSpentP, userCoins: userCoinsP });

        // Coin limit calculation and deduction (based on raw API response)
        // Calculate cost based on capped rawMedias (before filtering)
        const batchCost = (rawMedias.length || 0) * perPost;

        // Check coin limit (using coins_spent) and spend coins atomically
        if (rawMedias.length > 0) {
        const { data: userDataP, error: userErrP } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
        if (userErrP || typeof userDataP?.coins !== 'number') throw new Error('Could not fetch user coins');
          if (userDataP.coins < batchCost) throw new Error('insufficient_coins');
          
          const coinsSpent = typeof job.coins_spent === 'number' ? job.coins_spent : 0;
          if (coinLimitP !== undefined) {
            const remaining = Math.max(0, coinLimitP - coinsSpent);
            console.log('[Process API] Coin limit check (posts):', { coinLimit: coinLimitP, coinsSpent, remaining, batchCost });
            if (batchCost > remaining) {
              console.log('[Process API] Coin limit reached for posts; stopping before processing batch');
              const updStop = {
                page_count: (job.page_count || 0) + 1,
                progress: (job.progress || 0) + 0,
                status: 'completed',
                completed_at: new Date().toISOString(),
                error_message: null,
                next_page_id: null,
                current_step: JSON.stringify(step),
                locked_by: null,
              } as Record<string, unknown>;
              await supabase.from('extractions').update(updStop).eq('id', job.id).eq('locked_by', workerId);
              return NextResponse.json({ message: 'Coin limit reached', jobId: job.id, ...updStop });
            }
          }

          console.log('[Process API] Spending coins (posts) via RPC:', batchCost);
          const { error: spendErrP } = await supabase.rpc('spend_extraction_coins', {
            p_user_id: job.user_id,
            p_extraction_id: job.id,
            p_amount: batchCost,
          });
          if (spendErrP) throw new Error(spendErrP.message);
          job.coins_spent = (typeof job.coins_spent === 'number' ? job.coins_spent : 0) + batchCost;
        }

        // Process all medias (no pre-filtering by coin limit)
        const toProcess = rawMedias;

        // Apply posts filters AFTER deduction (likes/comments ranges, caption contains/stop, etc.)
  const likesMin = Number((parsedFilters?.likesMin as number | string | undefined) ?? NaN);
  const likesMax = Number((parsedFilters?.likesMax as number | string | undefined) ?? NaN);
  const commentsMin = Number((parsedFilters?.commentsMin as number | string | undefined) ?? NaN);
  const commentsMax = Number((parsedFilters?.commentsMax as number | string | undefined) ?? NaN);
        const captionContainsStr = parsedFilters?.captionContains as string | undefined;
        const captionStopStr = parsedFilters?.captionStopWords as string | undefined;
        const containsWords = captionContainsStr ? captionContainsStr.split(/\r?\n/).map(w=>w.trim()).filter(Boolean) : [];
        const stopWords = captionStopStr ? captionStopStr.split(/\r?\n/).map(w=>w.trim()).filter(Boolean) : [];
        let stopTriggered = false;
        interface Media {
          like_count?: number;
          comment_count?: number;
          caption?: string | { text?: string };
          [key: string]: unknown;
        }
        const filteredMedias: Media[] = [];
  for (const m of toProcess) {
          let include = true;
          if (!Number.isNaN(likesMin) && typeof m.like_count === 'number' && m.like_count < likesMin) include = false;
          if (!Number.isNaN(likesMax) && typeof m.like_count === 'number' && m.like_count > likesMax) include = false;
          if (!Number.isNaN(commentsMin) && typeof m.comment_count === 'number' && m.comment_count < commentsMin) include = false;
          if (!Number.isNaN(commentsMax) && typeof m.comment_count === 'number' && m.comment_count > commentsMax) include = false;
          const captionText = ((): string => {
            if (typeof m.caption === 'string') return m.caption.toLowerCase();
            if (m.caption && typeof m.caption.text === 'string') return m.caption.text.toLowerCase();
            return '';
          })();
          if (containsWords.length && !containsWords.some(w => captionText.includes(w.toLowerCase()))) include = false;
          if (stopWords.length && stopWords.some(w => captionText.includes(w.toLowerCase()))) { stopTriggered = true; }
          if (!stopTriggered && include) filteredMedias.push(m);
          if (stopTriggered) break;
        }

        // Map to extracted_posts rows
        const postsRows = filteredMedias.map((m) => {
          let captionText: string | null = null;
          if (typeof m.caption === 'string') {
            captionText = m.caption;
          } else if (m.caption && typeof m.caption === 'object' && 'text' in m.caption && typeof (m.caption as { text?: string }).text === 'string') {
            captionText = (m.caption as { text?: string }).text || null;
          }
          let takenAt: string | null = null;
          if (typeof m.taken_at === 'number') {
            takenAt = new Date(m.taken_at * 1000).toISOString();
          }
          let thumbnailUrl: string | null = null;
          if (typeof m.thumbnail_url === 'string') {
            thumbnailUrl = m.thumbnail_url;
          } else if (m.image_versions2 && typeof m.image_versions2 === 'object' && Array.isArray((m.image_versions2 as { candidates?: { url?: string }[] }).candidates)) {
            thumbnailUrl = (m.image_versions2 as { candidates?: { url?: string }[] }).candidates?.[0]?.url || null;
          }
          return {
            extraction_id: job.id,
            post_id: m.id,
            code: m.code,
            caption_text: captionText,
            media_type: m.media_type,
            product_type: m.product_type || null,
            taken_at: takenAt,
            like_count: m.like_count ?? 0,
            comment_count: m.comment_count ?? 0,
            thumbnail_url: thumbnailUrl,
            user_id: active.pk,
            username: active.username,
          };
        });
        if (postsRows.length > 0) {
          console.log('[Process API] Inserting posts to DB:', postsRows.length);
          const { error: insErr } = await supabase.from('extracted_posts').insert(postsRows);
          if (insErr) throw new Error(insErr.message);
        }

        let next_page_id = page.next_page_id;
        if (next_page_id && step.page_id && next_page_id === step.page_id) {
          console.warn('[Process API] Duplicate next_page_id detected for posts; stopping pagination for this target:', next_page_id);
          next_page_id = undefined;
        }
        if (next_page_id) {
          console.log('[Process API] Advancing to next posts page:', next_page_id);
          step.page_id = next_page_id;
        } else {
          step.idx += 1;
          step.page_id = undefined;
        }
        {
    const hasMore = (!stopTriggered) && ((step.idx < step.targets.length) || !!step.page_id);
    console.log('[Process API] hasMore:', hasMore);
          const upd: Record<string, unknown> = {
            page_count: (job.page_count || 0) + 1,
            progress: (job.progress || 0) + postsRows.length,
            status: hasMore ? 'running' : 'completed',
            completed_at: hasMore ? null : new Date().toISOString(),
            error_message: null,
            next_page_id: step.page_id || null,
            current_step: JSON.stringify(step),
            locked_by: hasMore ? workerId : null,
          };
    console.log('[Process API] Updating extraction row for posts...');
    const { error: upErr } = await supabase.from('extractions').update(upd).eq('id', job.id).eq('locked_by', workerId);
    if (upErr) throw new Error(upErr.message);
    console.log('[Process API] Posts batch processed');
          if (hasMore) {
            console.log('[Process API] Chaining next posts batch...');
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/extractions/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-supabase-signature': process.env.SUPABASE_WEBHOOK_SECRET || '' },
              body: JSON.stringify({ record: { id: job.id } }),
            });
          }
    console.log('[Process API] Posts extraction complete');
    return NextResponse.json({ message: 'Posts batch processed', jobId: job.id, ...upd });
        }
      }
        break;
      case 'commenters': {
        console.log('[Process API] Starting commenters extraction');
        // Resolve URLs to media IDs once; store in current_step
  const urlStr = job.target_usernames || '';
  console.log('[Process API] Commenters URLs:', urlStr);
        const urls = String(urlStr).split(',').map((u: string) => u.trim()).filter(Boolean);
        if (urls.length === 0) throw new Error('No URLs provided');

        interface StepCommenters {
          idx: number;
          page_id?: string;
          targets: { url: string; mediaId: string }[];
        }
  let step: StepCommenters = { idx: 0, targets: [] };
  console.log('[Process API] Commenters step:', step);
        try { step = job.current_step ? JSON.parse(job.current_step) : {}; } catch {}

        if (!Array.isArray(step.targets)) {
          console.log('[Process API] Resolving commenters targets...');
          const resolved: { url: string; mediaId: string }[] = [];
          for (const url of urls) {
            try {
              const media = await mediaByUrlV1(url);
              if (media?.id) resolved.push({ url, mediaId: media.id });
            } catch {}
          }
          if (!resolved.length) throw new Error('No valid media IDs');
          step = { idx: 0, page_id: undefined, targets: resolved };
          await supabase.from('extractions').update({ current_step: JSON.stringify(step) }).eq('id', job.id).eq('locked_by', workerId);
        }

        if (!step.targets.length || step.idx >= step.targets.length) {
          console.log('[Process API] No commenters to process, finishing.');
          return NextResponse.json({ message: 'No commenters to process', jobId: job.id });
        }

  const active = step.targets[step.idx];
  console.log('[Process API] Processing commenters target:', active);
  console.log('[Process API] Fetching comments page for mediaId:', active.mediaId, 'page_id:', step.page_id);
  const page = await getCommentsPage(active.mediaId, step.page_id);
        const comments = page.items || [];

        // Cap by remaining coin limit and balance BEFORE spending (commenters)
        const coinLimitRaw = (parsedFilters?.commenters?.coinLimit ?? parsedFilters?.coinLimit) as number | string | undefined;
        const coinLimit = coinLimitRaw !== undefined ? Math.floor(Number(coinLimitRaw)) : undefined;
        const perChunkUsers = COIN_RULES.commenters.perChunk.users; // 2
        const perChunkCoins = COIN_RULES.commenters.perChunk.coins; // 1
        const perUserTotalCommenters = perChunkCoins / perChunkUsers; // cost per user
        const { data: balC, error: balErrC } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
        if (balErrC || typeof balC?.coins !== 'number') throw new Error('Could not fetch user coins');
        const userCoinsC = balC.coins;
        const coinsSpentC = typeof job.coins_spent === 'number' ? job.coins_spent : 0;
        const remainingByLimitC = coinLimit !== undefined ? Math.max(0, coinLimit - coinsSpentC) : Number.POSITIVE_INFINITY;
        const maxByLimitC = Math.floor(remainingByLimitC / perUserTotalCommenters);
        const maxByBalanceC = Math.floor(userCoinsC / perUserTotalCommenters);
        const allowedRawComments = Math.max(0, Math.min(comments.length, maxByLimitC, maxByBalanceC));
        const rawComments = comments.slice(0, allowedRawComments);
        console.log('[Process API] Commenters cap before spending:', { comments: comments.length, allowedRawComments, coinsSpent: coinsSpentC, userCoins: userCoinsC });

        // Per-chunk rule: 1 coin per 2 commenters
        const batchCost = Math.ceil((rawComments.length || 0) / perChunkUsers) * perChunkCoins;

        // Check coin limit (using coins_spent) and spend coins atomically
        if (rawComments.length > 0) {
        const { data: userDataC, error: userErrC } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
        if (userErrC || typeof userDataC?.coins !== 'number') throw new Error('Could not fetch user coins');
          if (userDataC.coins < batchCost) throw new Error('insufficient_coins');
          
          const coinsSpent = typeof job.coins_spent === 'number' ? job.coins_spent : 0;
          if (coinLimit !== undefined) {
            const remaining = Math.max(0, coinLimit - coinsSpent);
            console.log('[Process API] Coin limit check (commenters):', { coinLimit, coinsSpent, remaining, batchCost });
            if (batchCost > remaining) {
              console.log('[Process API] Coin limit reached for commenters; stopping before processing batch');
              const updStop = {
                page_count: (job.page_count || 0) + 1,
                progress: (job.progress || 0) + 0,
                status: 'completed',
                completed_at: new Date().toISOString(),
                error_message: null,
                next_page_id: null,
                current_step: JSON.stringify(step),
                locked_by: null,
              } as Record<string, unknown>;
              await supabase.from('extractions').update(updStop).eq('id', job.id).eq('locked_by', workerId);
              return NextResponse.json({ message: 'Coin limit reached', jobId: job.id, ...updStop });
            }
          }

          console.log('[Process API] Spending coins (commenters) via RPC:', batchCost);
          const { error: spendErrC } = await supabase.rpc('spend_extraction_coins', {
            p_user_id: job.user_id,
            p_extraction_id: job.id,
            p_amount: batchCost,
          });
          if (spendErrC) throw new Error(spendErrC.message);
          job.coins_spent = (typeof job.coins_spent === 'number' ? job.coins_spent : 0) + batchCost;
        }

        // Process all comments (no pre-filtering by coin limit)
        const toProcess = rawComments;

        // Apply commenters filters AFTER deduction
        // Exclude words and stop words
        const excludeWordsStr = parsedFilters?.commentExcludeWords as string | undefined;
        const stopWordsStr = parsedFilters?.commentStopWords as string | undefined;
        const excludeWords = excludeWordsStr ? String(excludeWordsStr).split(/\r?\n/).map(w=>w.trim().toLowerCase()).filter(Boolean) : [];
        const stopWords = stopWordsStr ? String(stopWordsStr).split(/\r?\n/).map(w=>w.trim().toLowerCase()).filter(Boolean) : [];
        let stopTriggered = false;
        type CommentItem = { pk: string; media_id: string; user_id: string; text?: string; like_count?: number; comment_like_count?: number; created_at?: number; parent_comment_id?: string; user?: { username?: string; full_name?: string; profile_pic_url?: string; is_private?: boolean; is_verified?: boolean; is_mentionable?: boolean } };
        const filtered: CommentItem[] = [];
        for (const c of toProcess as CommentItem[]) {
          const text = String(c.text || '').toLowerCase();
          if (excludeWords.length && excludeWords.some(w => text.includes(w))) continue;
          if (stopWords.length && stopWords.some(w => text.includes(w))) { stopTriggered = true; break; }
          filtered.push(c);
        }

        // Map for DB
        const rows = filtered.map((c) => ({
          extraction_id: job.id,
          comment_id: c.pk,
          media_id: c.media_id,
          user_id: c.user_id,
          username: c.user?.username || '',
          full_name: c.user?.full_name || '',
          profile_pic_url: c.user?.profile_pic_url || '',
          is_private: c.user?.is_private ?? null,
          is_verified: c.user?.is_verified ?? null,
          is_mentionable: c.user?.is_mentionable ?? null,
          comment_text: c.text || '',
          like_count: c.like_count ?? c.comment_like_count ?? 0,
          created_at: c.created_at ? new Date(c.created_at * 1000).toISOString() : null,
          parent_comment_id: c.parent_comment_id ?? null,
        }));

        // Insert filtered commenters to database
        if (rows.length > 0) {
          console.log('[Process API] Inserting commenters to DB:', rows.length);
          const { error: insErr } = await supabase.from('extracted_commenters').insert(rows);
          if (insErr) throw new Error(insErr.message);
        }

        // Advance page/target
        let next_page_id = page.next_page_id;
        if (next_page_id && step.page_id && next_page_id === step.page_id) {
          console.warn('[Process API] Duplicate next_page_id detected for commenters; stopping pagination for this target:', next_page_id);
          next_page_id = undefined;
        }
        if (next_page_id) {
          console.log('[Process API] Advancing to next commenters page:', next_page_id);
          step.page_id = next_page_id;
        } else {
          step.idx += 1;
          step.page_id = undefined;
        }

        {
    const hasMore = (!stopTriggered) && ((step.idx < step.targets.length) || !!step.page_id);
    console.log('[Process API] hasMore:', hasMore);
          const upd = {
            page_count: (job.page_count || 0) + 1,
            progress: (job.progress || 0) + rows.length,
            status: hasMore ? 'running' : 'completed',
            completed_at: hasMore ? null : new Date().toISOString(),
            error_message: null,
            next_page_id: step.page_id || null,
            current_step: JSON.stringify(step),
            locked_by: hasMore ? workerId : null,
          } as Record<string, unknown>;
    console.log('[Process API] Updating extraction row for commenters...');
    const { error: upErr } = await supabase.from('extractions').update(upd).eq('id', job.id).eq('locked_by', workerId);
    if (upErr) throw new Error(upErr.message);
    console.log('[Process API] Commenters batch processed');

          if (hasMore) {
            console.log('[Process API] Chaining next commenters batch...');
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/extractions/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-supabase-signature': process.env.SUPABASE_WEBHOOK_SECRET || '' },
              body: JSON.stringify({ record: { id: job.id } }),
            });
          }
    console.log('[Process API] Commenters extraction complete');
    return NextResponse.json({ message: 'Commenters batch processed', jobId: job.id, ...upd });
        }
      }
        break;
      case 'hashtags': {
        console.log('[Process API] Starting hashtags extraction');
        
  const hashtagsArr = typeof job.target_usernames === 'string'
  
          ? job.target_usernames.split(',').map((h: string) => h.trim()).filter(Boolean)
          : [];
        if (!hashtagsArr.length) throw new Error('No hashtags provided');
        console.log('[Process API] Hashtags:', job.target_usernames);
        interface StepHashtag {
          idx: number;
          page_id?: string;
          targets: string[];
        }
  let step: StepHashtag = { idx: 0, targets: [] };
  console.log('[Process API] Hashtag step:', step);
        try {
          step = job.current_step ? JSON.parse(job.current_step) : { idx: 0, targets: [] };
        } catch {}
        if (!Array.isArray(step.targets)) {
          console.log('[Process API] Resolving hashtag targets...');
          step = { idx: 0, page_id: undefined, targets: hashtagsArr };
          await supabase.from('extractions').update({ current_step: JSON.stringify(step) }).eq('id', job.id).eq('locked_by', workerId);
        }
        if (!step.targets.length || step.idx >= step.targets.length) {
          console.log('[Process API] No hashtags to process, finishing.');
          return NextResponse.json({ message: 'No hashtag clips to process', jobId: job.id });
        }

  const hashtag = step.targets[step.idx];
  console.log('[Process API] Processing hashtag target:', hashtag);
  console.log('[Process API] Fetching hashtag clips page for:', hashtag, 'page_id:', step.page_id);
  const page = await getHashtagClipsPage(hashtag, step.page_id, parsedFilters || {});
        const clips = page.items || [];

        // Cap by remaining coin limit and balance BEFORE spending (hashtags)
        const coinLimitRaw = (parsedFilters?.hashtags?.coinLimit ?? parsedFilters?.coinLimit) as number | string | undefined;
        const coinLimit = coinLimitRaw !== undefined ? Math.floor(Number(coinLimitRaw)) : undefined;
        const perData = COIN_RULES.hashtags.perData;
        const { data: balH, error: balErrH } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
        if (balErrH || typeof balH?.coins !== 'number') throw new Error('Could not fetch user coins');
        const userCoinsH = balH.coins;
        const coinsSpentH = typeof job.coins_spent === 'number' ? job.coins_spent : 0;
        const remainingByLimitH = coinLimit !== undefined ? Math.max(0, coinLimit - coinsSpentH) : Number.POSITIVE_INFINITY;
        const maxItemsByLimitH = Math.floor(remainingByLimitH / perData);
        const maxItemsByBalanceH = Math.floor(userCoinsH / perData);
        const allowedRawClips = Math.max(0, Math.min(clips.length, maxItemsByLimitH, maxItemsByBalanceH));
        const rawClips = clips.slice(0, allowedRawClips);
        console.log('[Process API] Hashtags cap before spending:', { clips: clips.length, allowedRawClips, coinsSpent: coinsSpentH, userCoins: userCoinsH });

        // Coin limit calculation and deduction (based on raw API response)
        // Calculate cost based on capped rawClips (before filtering)
        const batchCost = (rawClips.length || 0) * perData;

        // Check coin limit (using coins_spent) and spend coins atomically
        if (rawClips.length > 0) {
        const { data: userDataH, error: userErrH } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
        if (userErrH || typeof userDataH?.coins !== 'number') throw new Error('Could not fetch user coins');
          if (userDataH.coins < batchCost) throw new Error('insufficient_coins');
          
          const coinsSpent = typeof job.coins_spent === 'number' ? job.coins_spent : 0;
          if (coinLimit !== undefined) {
            const remaining = Math.max(0, coinLimit - coinsSpent);
            console.log('[Process API] Coin limit check (hashtags):', { coinLimit, coinsSpent, remaining, batchCost });
            if (batchCost > remaining) {
              console.log('[Process API] Coin limit reached for hashtags; stopping before processing batch');
              const updStop = {
                page_count: (job.page_count || 0) + 1,
                progress: (job.progress || 0) + 0,
                status: 'completed',
                completed_at: new Date().toISOString(),
                error_message: null,
                next_page_id: null,
                current_step: JSON.stringify(step),
                locked_by: null,
              } as Record<string, unknown>;
              await supabase.from('extractions').update(updStop).eq('id', job.id).eq('locked_by', workerId);
              return NextResponse.json({ message: 'Coin limit reached', jobId: job.id, ...updStop });
            }
          }

          console.log('[Process API] Spending coins (hashtags) via RPC:', batchCost);
          const { error: spendErrH } = await supabase.rpc('spend_extraction_coins', {
            p_user_id: job.user_id,
            p_extraction_id: job.id,
            p_amount: batchCost,
          });
          if (spendErrH) throw new Error(spendErrH.message);
          job.coins_spent = (typeof job.coins_spent === 'number' ? job.coins_spent : 0) + batchCost;
        }

        // Process all clips (no pre-filtering by coin limit)
        const toProcess = rawClips;

        // Apply hashtag filters AFTER deduction (caption contains/stop, etc.) if provided
        const captionContainsStr = parsedFilters?.postCaptionContains as string | undefined;
        const stopStr = parsedFilters?.postCaptionStopWords as string | undefined;
        const containsWords = captionContainsStr ? captionContainsStr.split(/\r?\n/).map(w=>w.trim()).filter(Boolean) : [];
        const stopWords = stopStr ? stopStr.split(/\r?\n/).map(w=>w.trim()).filter(Boolean) : [];
        let stopTriggered = false;
        interface ClipUser {
          username?: string;
          full_name?: string;
          profile_pic_url?: string;
          is_verified?: boolean;
          is_private?: boolean;
        }
        interface ClipItem {
          media?: unknown;
          id?: string;
          pk?: string;
          media_url?: string;
          video_url?: string;
          image_url?: string;
          image_versions2?: { candidates?: { url?: string }[] };
          taken_at?: number;
          like_count?: number;
          caption?: string | { text?: string };
          caption_text?: string;
          hashtags?: string[] | string;
          username?: string;
          user?: ClipUser;
        }
        const filteredClips: ClipItem[] = [];
        for (const clip of toProcess as ClipItem[]) {
          const m: ClipItem = (clip.media && typeof clip.media === 'object') ? (clip.media as ClipItem) : clip;
          let text = '';
          if (
            typeof m.caption === 'object' &&
            m.caption &&
            'text' in m.caption &&
            typeof (m.caption as { text?: string }).text === 'string' &&
            (m.caption as { text?: string }).text != null
          ) {
            text = ((m.caption as { text?: string }).text ?? '').toLowerCase();
          } else if (typeof m.caption === 'string') {
            text = m.caption.toLowerCase();
          } else if (typeof m.caption_text === 'string') {
            text = m.caption_text.toLowerCase();
          }
          if (containsWords.length && !containsWords.some(w => text.includes(w.toLowerCase()))) continue;
          if (stopWords.length && stopWords.some(w => text.includes(w.toLowerCase()))) { stopTriggered = true; }
          if (!stopTriggered) filteredClips.push(clip);
          if (stopTriggered) break;
        }

        // Map to extracted_hashtag_posts rows
        const rows = filteredClips.map((clip) => {
          const m: ClipItem = (clip.media && typeof clip.media === 'object') ? (clip.media as ClipItem) : clip;
          return {
            extraction_id: job.id,
            post_id: m.id || m.pk || null,
            media_url: m.media_url || m.video_url || m.image_url || (m.image_versions2?.candidates?.[0]?.url) || null,
            taken_at: typeof m.taken_at === 'number' ? new Date(m.taken_at * 1000).toISOString() : null,
            like_count: typeof m.like_count === 'number' ? m.like_count : 0,
            caption: (typeof m.caption === 'object' && m.caption && 'text' in m.caption && typeof (m.caption as { text?: string }).text === 'string')
              ? (m.caption as { text?: string }).text
              : (typeof m.caption === 'string' ? m.caption : (typeof m.caption_text === 'string' ? m.caption_text : null)),
            hashtags: Array.isArray(m.hashtags) ? m.hashtags.join(',') : (typeof m.hashtags === 'string' ? m.hashtags : null),
            username: typeof m.username === 'string' ? m.username : (m.user && typeof m.user.username === 'string' ? m.user.username : null),
            full_name: m.user && typeof m.user.full_name === 'string' ? m.user.full_name : null,
            profile_pic_url: m.user && typeof m.user.profile_pic_url === 'string' ? m.user.profile_pic_url : null,
            is_verified: m.user && typeof m.user.is_verified === 'boolean' ? m.user.is_verified : false,
            is_private: m.user && typeof m.user.is_private === 'boolean' ? m.user.is_private : false,
          };
        }).filter((r) => typeof r.post_id === 'string' && !!r.post_id);

        if (rows.length > 0) {
          console.log('[Process API] Inserting hashtag posts to DB:', rows.length);
          const { error: insErr } = await supabase.from('extracted_hashtag_posts').insert(rows);
          if (insErr) throw new Error(insErr.message);
        }

        let next_page_id = page.next_page_id;
        if (next_page_id && step.page_id && next_page_id === step.page_id) {
          console.warn('[Process API] Duplicate next_page_id detected for hashtags; stopping pagination for this target:', next_page_id);
          next_page_id = undefined;
        }
        if (next_page_id) {
          console.log('[Process API] Advancing to next hashtag page:', next_page_id);
          step.page_id = next_page_id;
        } else {
          step.idx += 1;
          step.page_id = undefined;
        }

        {
    const hasMore = (!stopTriggered) && ((step.idx < step.targets.length) || !!step.page_id);
    console.log('[Process API] hasMore:', hasMore);
          const upd: Record<string, unknown> = {
            page_count: (job.page_count || 0) + 1,
            progress: (job.progress || 0) + rows.length,
            status: hasMore ? 'running' : 'completed',
            completed_at: hasMore ? null : new Date().toISOString(),
            error_message: null,
            next_page_id: step.page_id || null,
            current_step: JSON.stringify(step),
            locked_by: hasMore ? workerId : null,
          };
    console.log('[Process API] Updating extraction row for hashtags...');
    const { error: upErr } = await supabase.from('extractions').update(upd).eq('id', job.id).eq('locked_by', workerId);
    if (upErr) throw new Error(upErr.message);
    console.log('[Process API] Hashtags batch processed');
          if (hasMore) {
            console.log('[Process API] Chaining next hashtags batch...');
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/extractions/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-supabase-signature': process.env.SUPABASE_WEBHOOK_SECRET || '' },
              body: JSON.stringify({ record: { id: job.id } }),
            });
          }
    console.log('[Process API] Hashtags extraction complete');
    return NextResponse.json({ message: 'Hashtag batch processed', jobId: job.id, ...upd });
        }
      }
        break;
      default:
        console.error('[Process API] Unsupported extraction_type:', job.extraction_type);
        console.error('[Process API] Unsupported extraction_type:', job.extraction_type);
  throw new Error('Unsupported extraction_type: ' + job.extraction_type);
    }

    // Current service functions complete pagination internally and don't expose cursors
    // Fallback path not used in batched types
    const isDone = true;

  console.log('[Process API] Final updateFields:', updateFields);
  updateFields = {
      page_count: (job.page_count || 0) + 1,
      progress: progressCount,
      status: isDone ? 'completed' : 'running',
      completed_at: isDone ? new Date().toISOString() : null,
      error_message: null,
    };
    updateFields.next_page_id = null;
    // maintain/refresh lock until done
    if (isDone) {
      updateFields.locked_by = null;
    } else {
      updateFields.locked_by = workerId;
    }

  console.log('[Process API] Final DB update for job:', job.id);
  console.log('[Process API] Update fields:', updateFields);
  const { error: updateError } = await supabase
      .from('extractions')
      .update(updateFields)
      .eq('id', job.id)
      .eq('locked_by', workerId);

    if (updateError) {
      console.error('[Process API] Error updating extraction:', updateError.message);
      console.error('[Process API] Update error details:', updateError);
      throw new Error(updateError.message);
    }

    console.log('[Process API] Successfully updated extraction in database');
    console.log('[Process API] Chunk processed for job:', job.id, 'isDone:', isDone);
    console.log('[Process API] Returning success response');
    return NextResponse.json({ message: 'Chunk processed', jobId: job.id, ...updateFields });
  } catch (err: unknown) {
    console.error('[Process API] Exception thrown:', err);
    let message = 'Unknown error';
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      message = (err as { message: string }).message;
    }
    console.error('[Process API] Job failed:', job?.id, message);
    await supabase
      .from('extractions')
      .update({ status: 'failed', error_message: message, locked_by: null })
      .eq('id', job?.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
      
