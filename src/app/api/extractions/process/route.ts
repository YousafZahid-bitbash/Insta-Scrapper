
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

  const now = Date.now();
  const lockNotExpired = currentJob.lock_expires_at ? new Date(currentJob.lock_expires_at).getTime() > now : false;
  if (currentJob.locked_by && lockNotExpired) {
    console.warn('[Process API] Lock held by another worker');
    return NextResponse.json({ message: 'Lock held by another worker' });
  }

  const workerId = crypto.randomUUID();
  console.log('[Process API] Acquiring lock for worker:', workerId);
  const newLockExpiry = new Date(now + 30 * 60_000).toISOString(); // 30 minutes instead of 1 minute
  const currentVersion = typeof currentJob.version === 'number' ? currentJob.version : 0;
  const { error: lockErr, data: lockRows } = await supabase
    .from('extractions')
    .update({
      locked_by: workerId,
      lock_expires_at: newLockExpiry,
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

  // Use the fresh row for processing
  job = currentJob;
  console.log('[Process API] Using fresh job row for processing');

  // Step 1: early-exit on cancel and increment attempts (we own the lock now)
  if (job.cancel_requested === true) {
    console.warn('[Process API] Cancel requested for job, exiting:', job.id);
    await supabase
      .from('extractions')
      .update({ status: 'cancelled', locked_by: null, lock_expires_at: null })
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
        locked_by: null, 
        lock_expires_at: null 
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
            console.log(`[Process API] Resolving username: ${uname} (clean: ${clean})`);
            let user;
            try {
              user = await userByUsernameV1(clean);
              console.log(`[Process API] userByUsernameV1 result for ${clean}:`, user);
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

        type FilterObject = Record<string, unknown>;
        console.log('[Process API] Filtering users...');
        const filteredUsers = await extractFilteredUsers(
          pageUsers.map(u => ({ username: u.username })),
          (parsedFilters?.followers || parsedFilters || {}) as FilterObject,
          async (username: string): Promise<UserDetails> => {
            const d = await userByUsernameV1(username);
            return d as UserDetails;
          }
        );

        // Coin limit calculation
        const coinLimitRaw = (parsedFilters?.followers?.coinLimit ?? parsedFilters?.coinLimit) as number | string | undefined;
        const coinLimit = coinLimitRaw !== undefined ? Math.floor(Number(coinLimitRaw)) : undefined;
        let maxUsersWithinCoinLimit: number | undefined = undefined;
        if (coinLimit !== undefined) {
          const perUserTotal = (COIN_RULES.followers.perChunk.coins / COIN_RULES.followers.perChunk.users) + COIN_RULES.followers.perUser;
          maxUsersWithinCoinLimit = Math.floor(coinLimit / perUserTotal);
        }
        if (maxUsersWithinCoinLimit !== undefined) {
          const remaining = Math.max(0, maxUsersWithinCoinLimit - (job.progress || 0));
          if (filteredUsers.length > remaining) filteredUsers.splice(remaining);
        }

        // Batch cost (charge only for rows we actually save)
        const batchExtractionCost = Math.ceil((filteredUsers.length || 0) / COIN_RULES.followers.perChunk.users) * COIN_RULES.followers.perChunk.coins;
        const batchFilteringCost = (filteredUsers.length || 0) * COIN_RULES.followers.perUser;
        const batchCost = batchExtractionCost + batchFilteringCost;

        // Insert + deduct coins
        if (filteredUsers.length > 0) {
          console.log('[Process API] Inserting filtered users to DB:', filteredUsers.length);
          const { data: userData, error: userErr } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
          if (userErr || typeof userData?.coins !== 'number') throw new Error('Could not fetch user coins');
          if (userData.coins < batchCost) throw new Error('insufficient_coins');
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
          console.log('[Process API] Deducting coins for followers:', batchCost);
          await deductCoins(String(job.user_id), batchCost, supabase);
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
                lock_expires_at: hasMore ? new Date(Date.now() + 30 * 60_000).toISOString() : null,
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

        type FilterObject = Record<string, unknown>;
  console.log('[Process API] Filtering users...');
  const filteredUsers = await extractFilteredUsers(
          pageUsers.map(u => ({ username: u.username })),
          (parsedFilters?.following || parsedFilters || {}) as FilterObject,
          async (username: string): Promise<UserDetails> => {
            const d = await userByUsernameV1(username);
            return d as UserDetails;
          }
        );

        const coinLimitRaw = (parsedFilters?.following?.coinLimit ?? parsedFilters?.coinLimit) as number | string | undefined;
        const coinLimit = coinLimitRaw !== undefined ? Math.floor(Number(coinLimitRaw)) : undefined;
        let maxUsersWithinCoinLimit: number | undefined = undefined;
        if (coinLimit !== undefined) {
          const perUserTotal = (COIN_RULES.followings.perChunk.coins / COIN_RULES.followings.perChunk.users) + COIN_RULES.followings.perUser;
          maxUsersWithinCoinLimit = Math.floor(coinLimit / perUserTotal);
        }
        if (maxUsersWithinCoinLimit !== undefined) {
          const remaining = Math.max(0, maxUsersWithinCoinLimit - (job.progress || 0));
          if (filteredUsers.length > remaining) filteredUsers.splice(remaining);
        }

        const batchExtractionCost = Math.ceil((filteredUsers.length || 0) / COIN_RULES.followings.perChunk.users) * COIN_RULES.followings.perChunk.coins;
        const batchFilteringCost = (filteredUsers.length || 0) * COIN_RULES.followings.perUser;
        const batchCost = batchExtractionCost + batchFilteringCost;

        if (filteredUsers.length > 0) {
          console.log('[Process API] Inserting filtered users to DB:', filteredUsers.length);
          const { data: userData, error: userErr } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
          if (userErr || typeof userData?.coins !== 'number') throw new Error('Could not fetch user coins');
          if (userData.coins < batchCost) throw new Error('insufficient_coins');
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
          console.log('[Process API] Deducting coins for following:', batchCost);
          await deductCoins(String(job.user_id), batchCost, supabase);
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
            lock_expires_at: hasMore ? new Date(Date.now() + 30 * 60_000).toISOString() : null,
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

        // Decide how many we can afford BEFORE filtration (extraction per-chunk + per-user detail)
        const { data: userData, error: userErr } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
        if (userErr || typeof userData?.coins !== 'number') throw new Error('Could not fetch user coins');
        const perChunkUsers = COIN_RULES.likers.perChunk.users; // 10 users per chunk
        const perChunkCoins = COIN_RULES.likers.perChunk.coins; // 1 coin per chunk
        const perUserDetail = COIN_RULES.likers.perUser; // 1 coin per user detail
        // Greedy cap by coins: approximate allowed users by solving chunks + per-user
        const maxByBalance = Math.max(0, Math.floor(userData.coins / (perUserDetail + perChunkCoins / perChunkUsers)));
        const coinLimitRaw = (parsedFilters?.coinLimit) as number | string | undefined;
        const coinLimit = coinLimitRaw !== undefined ? Math.floor(Number(coinLimitRaw)) : undefined;
        let maxByLimit = Number.POSITIVE_INFINITY;
        if (coinLimit !== undefined) maxByLimit = Math.floor(coinLimit / (perUserDetail + perChunkCoins / perChunkUsers));
        const allowedUsers = Math.min(likers.length, maxByBalance, maxByLimit);
        const toProcess = likers.slice(0, Math.max(0, allowedUsers));
        const batchCost = Math.ceil((toProcess.length || 0) / perChunkUsers) * perChunkCoins + (toProcess.length * perUserDetail);
        if (toProcess.length > 0 && batchCost > 0) {
          console.log('[Process API] Deducting coins for likers:', batchCost);
          await deductCoins(String(job.user_id), batchCost, supabase);
        }

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
            lock_expires_at: hasMore ? new Date(Date.now() + 30 * 60_000).toISOString() : null,
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

        // Decide how many posts we can afford BEFORE filtration
        const coinLimitRaw = (parsedFilters?.coinLimit) as number | string | undefined;
        const coinLimit = coinLimitRaw !== undefined ? Math.floor(Number(coinLimitRaw)) : undefined;
        const perPost = COIN_RULES.posts.perPost;
        const { data: userDataP, error: userErrP } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
        if (userErrP || typeof userDataP?.coins !== 'number') throw new Error('Could not fetch user coins');
        let maxByLimit = Number.POSITIVE_INFINITY;
        if (coinLimit !== undefined) maxByLimit = Math.floor(coinLimit / perPost);
        const maxByBalance = Math.floor(userDataP.coins / perPost);
        const allowedPosts = Math.min(medias.length, maxByLimit, maxByBalance);

        const toProcess = medias.slice(0, Math.max(0, allowedPosts));

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
          const batchCost = postsRows.length * perPost;
          const { data: userDataP2, error: userErrP2 } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
          if (userErrP2 || typeof userDataP2?.coins !== 'number') throw new Error('Could not fetch user coins');
          if (userDataP2.coins < batchCost) throw new Error('insufficient_coins');
          console.log('[Process API] Inserting posts to DB:', postsRows.length);
          const { error: insErr } = await supabase.from('extracted_posts').insert(postsRows);
          if (insErr) throw new Error(insErr.message);
          console.log('[Process API] Deducting coins for posts:', batchCost);
          await deductCoins(String(job.user_id), batchCost, supabase);
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
            lock_expires_at: hasMore ? new Date(Date.now() + 30 * 60_000).toISOString() : null,
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

        // Determine how many commenters we can afford BEFORE filtration
        const coinLimitRaw = (parsedFilters?.coinLimit) as number | string | undefined;
        const coinLimit = coinLimitRaw !== undefined ? Math.floor(Number(coinLimitRaw)) : undefined;
        // Per-chunk rule: 1 coin per 2 commenters
        const perChunkUsers = COIN_RULES.commenters.perChunk.users; // 2
        const perChunkCoins = COIN_RULES.commenters.perChunk.coins; // 1

        // Limit by coin limit budget
        let limitByCoinLimit: number | undefined;
        if (coinLimit !== undefined) {
          limitByCoinLimit = Math.max(0, coinLimit) * perChunkUsers; // coinLimit coins → coinLimit*2 commenters
        }
        // Limit by current user coins
        const { data: userDataC, error: userErrC } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
        if (userErrC || typeof userDataC?.coins !== 'number') throw new Error('Could not fetch user coins');
        const limitByBalance = Math.floor(userDataC.coins / perChunkCoins) * perChunkUsers;

        let allowed = comments.length;
        if (limitByCoinLimit !== undefined) allowed = Math.min(allowed, limitByCoinLimit);
        allowed = Math.min(allowed, limitByBalance);

        const toProcess = comments.slice(0, Math.max(0, allowed));

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

        // Deduct only if rows exist; chunk cost is per 2 commenters
        if (rows.length > 0) {
          const batchCost = Math.ceil(rows.length / perChunkUsers) * perChunkCoins;
          const { data: userDataC2, error: userErrC2 } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
          if (userErrC2 || typeof userDataC2?.coins !== 'number') throw new Error('Could not fetch user coins');
          if (userDataC2.coins < batchCost) throw new Error('insufficient_coins');
          console.log('[Process API] Inserting commenters to DB:', rows.length);
          const { error: insErr } = await supabase.from('extracted_commenters').insert(rows);
          if (insErr) throw new Error(insErr.message);
          console.log('[Process API] Deducting coins for commenters:', batchCost);
          await deductCoins(String(job.user_id), batchCost, supabase);
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
            lock_expires_at: hasMore ? new Date(Date.now() + 30 * 60_000).toISOString() : null,
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

        // Decide how many we can afford BEFORE filtration (hashtags cost per data)
        const coinLimitRaw = (parsedFilters?.coinLimit) as number | string | undefined;
        const coinLimit = coinLimitRaw !== undefined ? Math.floor(Number(coinLimitRaw)) : undefined;
        const perData = COIN_RULES.hashtags.perData;
        const { data: userDataH, error: userErrH } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
        if (userErrH || typeof userDataH?.coins !== 'number') throw new Error('Could not fetch user coins');
        let maxByLimit = Number.POSITIVE_INFINITY;
        if (coinLimit !== undefined) maxByLimit = Math.floor(coinLimit / perData);
        const maxByBalance = Math.floor(userDataH.coins / perData);
        const allowed = Math.min(clips.length, maxByLimit, maxByBalance);
        const toProcess = clips.slice(0, Math.max(0, allowed));

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
          const batchCost = rows.length * perData;
          const { data: userDataH2, error: userErrH2 } = await supabase.from('users').select('coins').eq('id', job.user_id).single();
          if (userErrH2 || typeof userDataH2?.coins !== 'number') throw new Error('Could not fetch user coins');
          if (userDataH2.coins < batchCost) throw new Error('insufficient_coins');
          console.log('[Process API] Inserting hashtag posts to DB:', rows.length);
          const { error: insErr } = await supabase.from('extracted_hashtag_posts').insert(rows);
          if (insErr) throw new Error(insErr.message);
          console.log('[Process API] Deducting coins for hashtags:', batchCost);
          await deductCoins(String(job.user_id), batchCost, supabase);
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
            lock_expires_at: hasMore ? new Date(Date.now() + 30 * 60_000).toISOString() : null,
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
      updateFields.lock_expires_at = null;
    } else {
      updateFields.locked_by = workerId;
      updateFields.lock_expires_at = new Date(Date.now() + 30 * 60_000).toISOString();
    }

  console.log('[Process API] Final DB update for job:', job.id);
  const { error: updateError } = await supabase
      .from('extractions')
      .update(updateFields)
      .eq('id', job.id)
      .eq('locked_by', workerId);

    if (updateError) {
      console.error('[Process API] Error updating extraction:', updateError.message);
      throw new Error(updateError.message);
    }

    console.log('[Process API] Chunk processed for job:', job.id, 'isDone:', isDone);
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
      .update({ status: 'failed', error_message: message, locked_by: null, lock_expires_at: null })
      .eq('id', job?.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
      
