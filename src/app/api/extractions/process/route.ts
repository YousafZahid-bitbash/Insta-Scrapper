
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { userFollowersChunkGqlByUsername, userFollowingChunkGqlByUsername, mediaLikersBulkV1, getUserPosts, extractCommentersBulkV2, extractHashtagClipsBulkV2, userByUsernameV1, getFollowersPage, getFollowingPage, extractFilteredUsers, mediaByUrlV1, getCommentsPage, getUserMediasPage, getHashtagClipsPage } from '../../../../services/hikerApi';
import { COIN_RULES, deductCoins } from '../../../../utils/coinLogic';

console.log('[Process API] Loaded process route');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {

  console.log('[Process API] POST /api/extractions/process called');
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
  if (!job) {
    console.warn('[Process API] No job record in payload');
    return NextResponse.json({ error: 'No job record in payload' }, { status: 400 });
  }

  // Re-fetch current job row to ensure fresh state and use optimistic locking
  const { data: currentJob, error: fetchErr } = await supabase
    .from('extractions')
    .select('*')
    .eq('id', job.id)
    .single();

  if (fetchErr || !currentJob) {
    console.warn('[Process API] Could not fetch job row', fetchErr?.message);
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (!['pending', 'running'].includes(currentJob.status)) {
    return NextResponse.json({ message: 'Job not in runnable state', status: currentJob.status });
  }

  const now = Date.now();
  const lockNotExpired = currentJob.lock_expires_at ? new Date(currentJob.lock_expires_at).getTime() > now : false;
  if (currentJob.locked_by && lockNotExpired) {
    return NextResponse.json({ message: 'Lock held by another worker' });
  }

  const workerId = crypto.randomUUID();
  const newLockExpiry = new Date(now + 60_000).toISOString();
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
    return NextResponse.json({ message: 'Lock already acquired elsewhere' }, { status: 200 });
  }

  // Use the fresh row for processing
  job = currentJob;

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
    switch (job.extraction_type) {
      case 'followers': {
        // Initialize or load batching state from current_step
        const usernames = targets.length ? targets : (job.target_usernames ? String(job.target_usernames).split(',').map((s:string)=>s.trim()).filter(Boolean) : []);
        if (usernames.length === 0) throw new Error('No usernames provided');

        let step: any = {};
        try { step = job.current_step ? JSON.parse(job.current_step) : {}; } catch {}

        if (!Array.isArray(step.targets)) {
          const resolvedTargets = [] as { username: string; pk: string; total: number }[];
          let totalEstimated = 0;
          for (const uname of usernames) {
            const clean = uname.replace(/^@/, '');
            const user = await userByUsernameV1(clean);
            if (user?.pk) {
              const total = typeof user.follower_count === 'number' ? user.follower_count : 0;
              totalEstimated += total;
              resolvedTargets.push({ username: clean, pk: user.pk, total });
            }
          }
          step = { idx: 0, page_id: undefined, targets: resolvedTargets, totalEstimated };
          await supabase.from('extractions').update({ current_step: JSON.stringify(step) }).eq('id', job.id).eq('locked_by', workerId);
        }

        if (!step.targets.length || step.idx >= step.targets.length) {
          extractionResult = { filteredFollowers: [], actualCoinCost: 0 } as any;
          break;
        }

        const active = step.targets[step.idx];
        const page = await getFollowersPage(active.pk, step.page_id);
        const pageUsers = page.items || [];

        const filteredUsers = await extractFilteredUsers(
          pageUsers.map(u => ({ username: u.username })),
          (parsedFilters?.followers || parsedFilters || {}) as any,
          async (username: string) => {
            const d = await userByUsernameV1(username);
            return d as any;
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

        // Batch cost
        const batchExtractionCost = Math.ceil((pageUsers.length || 0) / COIN_RULES.followers.perChunk.users) * COIN_RULES.followers.perChunk.coins;
        const batchFilteringCost = (filteredUsers.length || 0) * COIN_RULES.followers.perUser;
        const batchCost = batchExtractionCost + batchFilteringCost;

        // Insert + deduct coins
        if (filteredUsers.length > 0) {
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
          await deductCoins(String(job.user_id), batchCost, supabase);
        }

        // Advance cursor
        const next_page_id = page.next_page_id;
        if (next_page_id) {
          step.page_id = next_page_id;
        } else {
          step.idx += 1;
          step.page_id = undefined;
        }

        // Update state and decide chaining
        const hasMore = (step.idx < step.targets.length) || !!step.page_id;
        updateFields = {
          page_count: (job.page_count || 0) + 1,
          progress: (job.progress || 0) + filteredUsers.length,
          status: hasMore ? 'running' : 'completed',
          completed_at: hasMore ? null : new Date().toISOString(),
          error_message: null,
          next_page_id: step.page_id || null,
          current_step: JSON.stringify(step),
          locked_by: hasMore ? workerId : null,
          lock_expires_at: hasMore ? new Date(Date.now() + 60_000).toISOString() : null,
        };

        const { error: updateErrorFollowers } = await supabase
          .from('extractions')
          .update(updateFields)
          .eq('id', job.id)
          .eq('locked_by', workerId);
        if (updateErrorFollowers) throw new Error(updateErrorFollowers.message);

        // Chain next
        if (hasMore) {
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/extractions/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-supabase-signature': process.env.SUPABASE_WEBHOOK_SECRET || '' },
            body: JSON.stringify({ record: { id: job.id } }),
          });
        }

        return NextResponse.json({ message: 'Followers batch processed', jobId: job.id, ...updateFields });
      }
        
        
        break;
      case 'following': {
        const usernames = targets.length ? targets : (job.target_usernames ? String(job.target_usernames).split(',').map((s:string)=>s.trim()).filter(Boolean) : []);
        if (usernames.length === 0) throw new Error('No usernames provided');

        let step: any = {};
        try { step = job.current_step ? JSON.parse(job.current_step) : {}; } catch {}

        if (!Array.isArray(step.targets)) {
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
          extractionResult = { filteredFollowings: [], actualCoinCost: 0 } as any;
          break;
        }

        const active = step.targets[step.idx];
        const page = await getFollowingPage(active.pk, step.page_id);
        const pageUsers = page.items || [];

        const filteredUsers = await extractFilteredUsers(
          pageUsers.map(u => ({ username: u.username })),
          (parsedFilters?.following || parsedFilters || {}) as any,
          async (username: string) => {
            const d = await userByUsernameV1(username);
            return d as any;
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

        const batchExtractionCost = Math.ceil((pageUsers.length || 0) / COIN_RULES.followings.perChunk.users) * COIN_RULES.followings.perChunk.coins;
        const batchFilteringCost = (filteredUsers.length || 0) * COIN_RULES.followings.perUser;
        const batchCost = batchExtractionCost + batchFilteringCost;

        if (filteredUsers.length > 0) {
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
          await deductCoins(String(job.user_id), batchCost, supabase);
        }

        const next_page_id = page.next_page_id;
        if (next_page_id) {
          step.page_id = next_page_id;
        } else {
          step.idx += 1;
          step.page_id = undefined;
        }

        {
          const hasMore = (step.idx < step.targets.length) || !!step.page_id;
          const updateFollowing = {
            page_count: (job.page_count || 0) + 1,
            progress: (job.progress || 0) + filteredUsers.length,
            status: hasMore ? 'running' : 'completed',
            completed_at: hasMore ? null : new Date().toISOString(),
            error_message: null,
            next_page_id: step.page_id || null,
            current_step: JSON.stringify(step),
            locked_by: hasMore ? workerId : null,
            lock_expires_at: hasMore ? new Date(Date.now() + 60_000).toISOString() : null,
          } as any;
          const { error: updateErrorF } = await supabase
            .from('extractions')
            .update(updateFollowing)
            .eq('id', job.id)
            .eq('locked_by', workerId);
          if (updateErrorF) throw new Error(updateErrorF.message);

          if (hasMore) {
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/extractions/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-supabase-signature': process.env.SUPABASE_WEBHOOK_SECRET || '' },
              body: JSON.stringify({ record: { id: job.id } }),
            });
          }
          return NextResponse.json({ message: 'Following batch processed', jobId: job.id, ...updateFollowing });
        }
      }
        break;
      case 'likers': {
        const urlStr = job.target_usernames || '';
        const urls = String(urlStr).split(',').map((u: string) => u.trim()).filter(Boolean);
        if (urls.length === 0) throw new Error('No URLs provided');

        let step: any = {};
        try { step = job.current_step ? JSON.parse(job.current_step) : {}; } catch {}
        if (!Array.isArray(step.targets)) {
          const resolved: { url: string; mediaId: string }[] = [];
          for (const url of urls) {
            try { const media = await mediaByUrlV1(url); if (media?.id) resolved.push({ url, mediaId: media.id }); } catch {}
          }
          if (!resolved.length) throw new Error('No valid media IDs');
          step = { idx: 0, targets: resolved };
          await supabase.from('extractions').update({ current_step: JSON.stringify(step) }).eq('id', job.id).eq('locked_by', workerId);
        }
        if (!step.targets.length || step.idx >= step.targets.length) {
          return NextResponse.json({ message: 'No likers to process', jobId: job.id });
        }
        const active = step.targets[step.idx];
        // For likers endpoint, no pagination page_id (single list). Process per-URL per batch.
        const res = await mediaLikersBulkV1({ urls: [active.url], filters: parsedFilters || {}, user_id: job.user_id, skipCoinCheck: true }, updateProgress, undefined, job.id, supabase);
        const likers = (res as any)?.filteredLikers || [];

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
          await deductCoins(String(job.user_id), batchCost, supabase);
        }

        const rows = toProcess.map((u: any) => ({
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
        if (rows.length > 0) {
          const { error: insErr } = await supabase.from('extracted_users').insert(rows);
          if (insErr) throw new Error(insErr.message);
        }
        step.idx += 1;
        {
          const hasMore = step.idx < step.targets.length;
          const upd = {
            page_count: (job.page_count || 0) + 1,
            progress: (job.progress || 0) + rows.length,
            status: hasMore ? 'running' : 'completed',
            completed_at: hasMore ? null : new Date().toISOString(),
            error_message: null,
            next_page_id: null,
            current_step: JSON.stringify(step),
            locked_by: hasMore ? workerId : null,
            lock_expires_at: hasMore ? new Date(Date.now() + 60_000).toISOString() : null,
          } as any;
          const { error: upErr } = await supabase.from('extractions').update(upd).eq('id', job.id).eq('locked_by', workerId);
          if (upErr) throw new Error(upErr.message);
          if (hasMore) {
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/extractions/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-supabase-signature': process.env.SUPABASE_WEBHOOK_SECRET || '' },
              body: JSON.stringify({ record: { id: job.id } }),
            });
          }
          return NextResponse.json({ message: 'Likers batch processed', jobId: job.id, ...upd });
        }
      }
        break;
      case 'posts': {
        const usernames = targets.length ? targets : (job.target_usernames ? String(job.target_usernames).split(',').map((s:string)=>s.trim()).filter(Boolean) : []);
        if (usernames.length === 0) throw new Error('No usernames provided');

        let step: any = {};
        try { step = job.current_step ? JSON.parse(job.current_step) : {}; } catch {}
        if (!Array.isArray(step.targets)) {
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
          return NextResponse.json({ message: 'No posts to process', jobId: job.id });
        }

        const active = step.targets[step.idx];
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
        const batchCost = toProcess.length * perPost;
        if (toProcess.length > 0 && batchCost > 0) {
          await deductCoins(String(job.user_id), batchCost, supabase);
        }

        // Apply posts filters AFTER deduction (likes/comments ranges, caption contains/stop, etc.)
        const likesMin = Number((parsedFilters?.likesMin as any) ?? NaN);
        const likesMax = Number((parsedFilters?.likesMax as any) ?? NaN);
        const commentsMin = Number((parsedFilters?.commentsMin as any) ?? NaN);
        const commentsMax = Number((parsedFilters?.commentsMax as any) ?? NaN);
        const captionContainsStr = parsedFilters?.captionContains as string | undefined;
        const captionStopStr = parsedFilters?.captionStopWords as string | undefined;
        const containsWords = captionContainsStr ? captionContainsStr.split(/\r?\n/).map(w=>w.trim()).filter(Boolean) : [];
        const stopWords = captionStopStr ? captionStopStr.split(/\r?\n/).map(w=>w.trim()).filter(Boolean) : [];
        let stopTriggered = false;
        const filteredMedias = [] as any[];
        for (const m of toProcess) {
          let include = true;
          if (!Number.isNaN(likesMin) && typeof m.like_count === 'number' && m.like_count < likesMin) include = false;
          if (!Number.isNaN(likesMax) && typeof m.like_count === 'number' && m.like_count > likesMax) include = false;
          if (!Number.isNaN(commentsMin) && typeof m.comment_count === 'number' && m.comment_count < commentsMin) include = false;
          if (!Number.isNaN(commentsMax) && typeof m.comment_count === 'number' && m.comment_count > commentsMax) include = false;
          const captionText = typeof m.caption?.text === 'string' ? m.caption.text.toLowerCase() : '';
          if (containsWords.length && !containsWords.some(w => captionText.includes(w.toLowerCase()))) include = false;
          if (stopWords.length && stopWords.some(w => captionText.includes(w.toLowerCase()))) { stopTriggered = true; }
          if (!stopTriggered && include) filteredMedias.push(m);
          if (stopTriggered) break;
        }

        // Map to extracted_posts rows
        const postsRows = filteredMedias.map((m: any) => ({
          extraction_id: job.id,
          post_id: m.id,
          code: m.code,
          caption_text: m.caption?.text || null,
          media_type: m.media_type,
          product_type: m.product_type || null,
          taken_at: m.taken_at ? new Date(m.taken_at * 1000).toISOString() : null,
          like_count: m.like_count ?? 0,
          comment_count: m.comment_count ?? 0,
          thumbnail_url: m.thumbnail_url || (m.image_versions2?.candidates?.[0]?.url) || null,
          user_id: active.pk,
          username: active.username,
        }));
        if (postsRows.length > 0) {
          const { error: insErr } = await supabase.from('extracted_posts').insert(postsRows);
          if (insErr) throw new Error(insErr.message);
        }

        const next_page_id = page.next_page_id;
        if (next_page_id) {
          step.page_id = next_page_id;
        } else {
          step.idx += 1;
          step.page_id = undefined;
        }
        {
          const hasMore = (!stopTriggered) && ((step.idx < step.targets.length) || !!step.page_id);
          const upd = {
            page_count: (job.page_count || 0) + 1,
            progress: (job.progress || 0) + postsRows.length,
            status: hasMore ? 'running' : 'completed',
            completed_at: hasMore ? null : new Date().toISOString(),
            error_message: null,
            next_page_id: step.page_id || null,
            current_step: JSON.stringify(step),
            locked_by: hasMore ? workerId : null,
            lock_expires_at: hasMore ? new Date(Date.now() + 60_000).toISOString() : null,
          } as any;
          const { error: upErr } = await supabase.from('extractions').update(upd).eq('id', job.id).eq('locked_by', workerId);
          if (upErr) throw new Error(upErr.message);
          if (hasMore) {
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/extractions/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-supabase-signature': process.env.SUPABASE_WEBHOOK_SECRET || '' },
              body: JSON.stringify({ record: { id: job.id } }),
            });
          }
          return NextResponse.json({ message: 'Posts batch processed', jobId: job.id, ...upd });
        }
      }
        break;
      case 'commenters': {
        // Resolve URLs to media IDs once; store in current_step
        const urlStr = job.target_usernames || '';
        const urls = String(urlStr).split(',').map((u: string) => u.trim()).filter(Boolean);
        if (urls.length === 0) throw new Error('No URLs provided');

        let step: any = {};
        try { step = job.current_step ? JSON.parse(job.current_step) : {}; } catch {}

        if (!Array.isArray(step.targets)) {
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
          return NextResponse.json({ message: 'No commenters to process', jobId: job.id });
        }

        const active = step.targets[step.idx];
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

        let toProcess = comments.slice(0, Math.max(0, allowed));
        const batchCost = Math.ceil((toProcess.length || 0) / perChunkUsers) * perChunkCoins;
        if (toProcess.length > 0 && batchCost > 0) {
          await deductCoins(String(job.user_id), batchCost, supabase);
        }

        // Apply commenters filters AFTER deduction
        // Exclude words and stop words
        const excludeWordsStr = parsedFilters?.commentExcludeWords as string | undefined;
        const stopWordsStr = parsedFilters?.commentStopWords as string | undefined;
        const excludeWords = excludeWordsStr ? String(excludeWordsStr).split(/\r?\n/).map(w=>w.trim().toLowerCase()).filter(Boolean) : [];
        const stopWords = stopWordsStr ? String(stopWordsStr).split(/\r?\n/).map(w=>w.trim().toLowerCase()).filter(Boolean) : [];
        let stopTriggered = false;
        const filtered = [] as any[];
        for (const c of toProcess) {
          const text = String(c.text || '').toLowerCase();
          if (excludeWords.length && excludeWords.some(w => text.includes(w))) continue;
          if (stopWords.length && stopWords.some(w => text.includes(w))) { stopTriggered = true; break; }
          filtered.push(c);
        }

        // Map for DB
        const rows = filtered.map((c: any) => ({
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

        // Coins for commenters: batch cost by chunks of 2
        if (rows.length > 0) {
          const { error: insErr } = await supabase.from('extracted_commenters').insert(rows);
          if (insErr) throw new Error(insErr.message);
        }

        // Advance page/target
        const next_page_id = page.next_page_id;
        if (next_page_id) {
          step.page_id = next_page_id;
        } else {
          step.idx += 1;
          step.page_id = undefined;
        }

        {
          const hasMore = (!stopTriggered) && ((step.idx < step.targets.length) || !!step.page_id);
          const upd = {
            page_count: (job.page_count || 0) + 1,
            progress: (job.progress || 0) + rows.length,
            status: hasMore ? 'running' : 'completed',
            completed_at: hasMore ? null : new Date().toISOString(),
            error_message: null,
            next_page_id: step.page_id || null,
            current_step: JSON.stringify(step),
            locked_by: hasMore ? workerId : null,
            lock_expires_at: hasMore ? new Date(Date.now() + 60_000).toISOString() : null,
          } as any;
          const { error: upErr } = await supabase.from('extractions').update(upd).eq('id', job.id).eq('locked_by', workerId);
          if (upErr) throw new Error(upErr.message);

          if (hasMore) {
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/extractions/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-supabase-signature': process.env.SUPABASE_WEBHOOK_SECRET || '' },
              body: JSON.stringify({ record: { id: job.id } }),
            });
          }
          return NextResponse.json({ message: 'Commenters batch processed', jobId: job.id, ...upd });
        }
      }
        break;
      case 'hashtags': {
        const hashtagsArr = typeof job.target_usernames === 'string'
          ? job.target_usernames.split(',').map((h: string) => h.trim()).filter(Boolean)
          : [];
        if (!hashtagsArr.length) throw new Error('No hashtags provided');

        let step: any = {};
        try { step = job.current_step ? JSON.parse(job.current_step) : {}; } catch {}
        if (!Array.isArray(step.targets)) {
          step = { idx: 0, page_id: undefined, targets: hashtagsArr };
          await supabase.from('extractions').update({ current_step: JSON.stringify(step) }).eq('id', job.id).eq('locked_by', workerId);
        }
        if (!step.targets.length || step.idx >= step.targets.length) {
          return NextResponse.json({ message: 'No hashtag clips to process', jobId: job.id });
        }

        const hashtag = step.targets[step.idx];
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
        const batchCost = toProcess.length * perData;
        if (toProcess.length > 0 && batchCost > 0) {
          await deductCoins(String(job.user_id), batchCost, supabase);
        }

        // Apply hashtag filters AFTER deduction (caption contains/stop, etc.) if provided
        const captionContainsStr = parsedFilters?.postCaptionContains as string | undefined;
        const stopStr = parsedFilters?.postCaptionStopWords as string | undefined;
        const containsWords = captionContainsStr ? captionContainsStr.split(/\r?\n/).map(w=>w.trim()).filter(Boolean) : [];
        const stopWords = stopStr ? stopStr.split(/\r?\n/).map(w=>w.trim()).filter(Boolean) : [];
        let stopTriggered = false;
        const filteredClips = [] as any[];
        for (const clip of toProcess) {
          const m = clip.media || clip;
          const text = typeof m.caption?.text === 'string' ? m.caption.text.toLowerCase() : String(m.caption || m.caption_text || '').toLowerCase();
          if (containsWords.length && !containsWords.some(w => text.includes(w.toLowerCase()))) continue;
          if (stopWords.length && stopWords.some(w => text.includes(w.toLowerCase()))) { stopTriggered = true; }
          if (!stopTriggered) filteredClips.push(clip);
          if (stopTriggered) break;
        }

        // Map to extracted_hashtag_posts rows
        const rows = filteredClips.map((clip: any) => {
          const m = clip.media || clip;
          return {
            extraction_id: job.id,
            post_id: m.id || m.pk || null,
            media_url: m.media_url || m.video_url || m.image_url || (m.image_versions2?.candidates?.[0]?.url) || null,
            taken_at: m.taken_at ? new Date(m.taken_at * 1000).toISOString() : null,
            like_count: m.like_count || 0,
            caption: typeof m.caption === 'object' && m.caption ? (m.caption.text || null) : (m.caption || m.caption_text || null),
            hashtags: Array.isArray(m.hashtags) ? m.hashtags.join(',') : (m.hashtags || null),
            username: m.username || m.user?.username || null,
            full_name: m.user?.full_name || null,
            profile_pic_url: m.user?.profile_pic_url || null,
            is_verified: m.user?.is_verified || false,
            is_private: m.user?.is_private || false,
          };
        }).filter((r:any)=> r.post_id);

        // Coin cost for hashtags: perData (2) per row
        if (rows.length > 0) {
          const { error: insErr } = await supabase.from('extracted_hashtag_posts').insert(rows);
          if (insErr) throw new Error(insErr.message);
        }

        const next_page_id = page.next_page_id;
        if (next_page_id) {
          step.page_id = next_page_id;
        } else {
          step.idx += 1;
          step.page_id = undefined;
        }

        {
          const hasMore = (!stopTriggered) && ((step.idx < step.targets.length) || !!step.page_id);
          const upd = {
            page_count: (job.page_count || 0) + 1,
            progress: (job.progress || 0) + rows.length,
            status: hasMore ? 'running' : 'completed',
            completed_at: hasMore ? null : new Date().toISOString(),
            error_message: null,
            next_page_id: step.page_id || null,
            current_step: JSON.stringify(step),
            locked_by: hasMore ? workerId : null,
            lock_expires_at: hasMore ? new Date(Date.now() + 60_000).toISOString() : null,
          } as any;
          const { error: upErr } = await supabase.from('extractions').update(upd).eq('id', job.id).eq('locked_by', workerId);
          if (upErr) throw new Error(upErr.message);
          if (hasMore) {
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/extractions/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-supabase-signature': process.env.SUPABASE_WEBHOOK_SECRET || '' },
              body: JSON.stringify({ record: { id: job.id } }),
            });
          }
          return NextResponse.json({ message: 'Hashtag batch processed', jobId: job.id, ...upd });
        }
      }
        break;
      default:
        console.error('[Process API] Unsupported extraction_type:', job.extraction_type);
        throw new Error('Unsupported extraction_type: ' + job.extraction_type);
    }

    // Current service functions complete pagination internally and don't expose cursors
    const nextCursor = null;
    const isDone = true;

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
      (updateFields as any).locked_by = null;
      (updateFields as any).lock_expires_at = null;
    } else {
      (updateFields as any).locked_by = workerId;
      (updateFields as any).lock_expires_at = new Date(Date.now() + 60_000).toISOString();
    }

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
      
