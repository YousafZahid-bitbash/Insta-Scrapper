import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';
import { userFollowersChunkGqlByUsername, userFollowingChunkGqlByUsername, mediaLikersBulkV1, getUserPosts, extractCommentersBulkV2, extractHashtagClipsBulkV2 } from '../../../../services/hikerApi';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  // 1. Find a job to process (pending or in_progress)
  const { data: jobs, error: fetchError } = await supabase
    .from('extractions')
    .select('*')
    .in('status', ['pending', 'in_progress'])
    .order('requested_at', { ascending: true })
    .limit(1);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ message: 'No jobs to process.' });
  }

  const job = jobs[0];
  let updateFields: any = {};
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
        throw new Error('Unsupported extraction_type: ' + job.extraction_type);
    }

    // Determine if done (for now, if next_page_id is null or undefined, mark as completed)
    // You may want to refine this based on your extraction logic
    const isDone = !job.next_page_id || progressCount >= 100;

    updateFields = {
      page_count: (job.page_count || 0) + 1,
      progress: progressCount,
      // next_page_id: set by extraction logic if available, else null
      status: isDone ? 'completed' : 'in_progress',
      completed_at: isDone ? new Date().toISOString() : null,
      error_message: null,
    };

    // If chunking is supported, update next_page_id here. For now, clear it if done, else keep existing.
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
      throw new Error(updateError.message);
    }

    return NextResponse.json({ message: 'Chunk processed', jobId: job.id, ...updateFields });
  } catch (err: any) {
    await supabase
      .from('extractions')
      .update({ status: 'failed', error_message: err.message })
      .eq('id', job.id);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
