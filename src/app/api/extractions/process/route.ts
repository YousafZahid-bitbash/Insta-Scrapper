import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { userFollowersChunkGqlByUsername, userFollowingChunkGqlByUsername, mediaLikersBulkV1, getUserPosts, extractCommentersBulkV2, extractHashtagClipsBulkV2 } from '../../../../services/hikerApi';

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
  const job = payload.record;
  if (!job) {
    console.warn('[Process API] No job record in payload');
    return NextResponse.json({ error: 'No job record in payload' }, { status: 400 });
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
    switch (job.extraction_type) {
      case 'followers':
        extractionResult = await userFollowersChunkGqlByUsername(
          job.id,
          {
            target: targets,
            filters: parsedFilters || {},
            user_id: job.user_id,
            skipCoinCheck: true,
            end_cursor: job.next_page_id || undefined,
          },
          updateProgress,
          undefined,
          supabase
        );
        break;
      case 'following':
        extractionResult = await userFollowingChunkGqlByUsername(
          job.id,
          {
            target: targets,
            filters: parsedFilters || {},
            user_id: job.user_id,
            skipCoinCheck: true,
            end_cursor: job.next_page_id || undefined,
          },
          updateProgress,
          undefined,
          supabase
        );
        break;
      case 'likers':
        extractionResult = await mediaLikersBulkV1(
          {
            urls: job.urls || [],
            filters: parsedFilters || {},
            user_id: job.user_id,
          },
          updateProgress,
          undefined
        );
        break;
      case 'posts':
        extractionResult = await getUserPosts(
          {
            target: targets,
            filters: parsedFilters || {},
            user_id: job.user_id,
          },
          updateProgress,
          undefined
        );
        break;
      case 'commenters':
        extractionResult = await extractCommentersBulkV2(
          {
            urls: job.urls || [],
            filters: parsedFilters || {},
            user_id: job.user_id,
          },
          updateProgress,
          undefined
        );
        break;
      case 'hashtags':
        // Parse hashtags from target_usernames (comma-separated string)
        const hashtagsArr = typeof job.target_usernames === 'string'
          ? job.target_usernames.split(',').map((h: string) => h.trim()).filter(Boolean)
          : [];
        extractionResult = await extractHashtagClipsBulkV2(
          {
            hashtags: hashtagsArr,
            filters: parsedFilters || {},
            extraction_id: job.id,
            user_id: job.user_id,
          },
          updateProgress,
          undefined,
          supabase
        );
        break;
      default:
        console.error('[Process API] Unsupported extraction_type:', job.extraction_type);
        throw new Error('Unsupported extraction_type: ' + job.extraction_type);
    }

    // Determine if done (for now, if next_page_id is null or progress threshold met, mark as completed)
    const isDone = !job.next_page_id || progressCount >= 100;

    updateFields = {
      page_count: (job.page_count || 0) + 1,
      progress: progressCount,
      status: isDone ? 'completed' : 'in_progress',
      completed_at: isDone ? new Date().toISOString() : null,
      error_message: null,
    };
    if (isDone) {
      updateFields.next_page_id = null;
    } else {
      updateFields.next_page_id = job.next_page_id || null;
    }

    const { error: updateError } = await supabase
      .from('extractions')
      .update(updateFields)
      .eq('id', job.id);

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
      .update({ status: 'failed', error_message: message })
      .eq('id', job?.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
      
