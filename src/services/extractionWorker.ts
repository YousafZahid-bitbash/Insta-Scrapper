
import 'dotenv/config';
// Load environment variables from .env.local
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

// Debug environment loading
console.log('[Worker] Environment check:');
console.log('[Worker] NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING');
console.log('[Worker] NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
console.log('[Worker] NEXT_PUBLIC_HIKER_API_KEY:', process.env.NEXT_PUBLIC_HIKER_API_KEY ? 'SET' : 'MISSING');

// Validate environment variables first
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables.');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
  process.exit(1);
}

import { createClient } from '@supabase/supabase-js';

// Now import hikerApi after env vars are loaded
import {
  userFollowersChunkGqlByUsername,
  userFollowingChunkGqlByUsername,
  getUserPosts,
  mediaLikersBulkV1,
  extractCommentersBulkV2,
  extractHashtagClipsBulkV2
} from './hikerApi';

// Import coin utilities for refund logic
import { COIN_RULES } from '../utils/coinLogic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

let isShuttingDown = false;

process.on('SIGINT', () => {
  console.log('Gracefully shutting down worker...');
  isShuttingDown = true;
});




// Main extraction dispatcher supporting all types
async function runExtractionJob(extraction: any) {
  if (isShuttingDown) throw new Error('Worker shutting down');
  const { extraction_type, target_usernames, filters, urls, hashtags, user_id } = extraction;
  let parsedFilters = filters;
  if (typeof filters === 'string') {
    try { parsedFilters = JSON.parse(filters); } catch {}
  }
  // Parse target_usernames into array
  const targets = typeof target_usernames === 'string' ? target_usernames.split(',').map(t => t.trim()).filter(Boolean) : [];
  // Common progress updater
  const updateProgress = async (count: number) => {
    await supabase
      .from('extractions')
      .update({ progress: count })
      .eq('id', extraction.id);
    console.log(`Extraction ${extraction.id}: progress ${count}`);
  };

  switch (extraction_type) {
  case 'followers':
      console.log('[Worker] Starting followers extraction');
      console.log('[Worker] Extraction ID:', extraction.id);
      console.log('[Worker] User ID:', user_id);
      console.log('[Worker] Target usernames:', targets);
      console.log('[Worker] Filters:', parsedFilters);
      
      const result = await userFollowersChunkGqlByUsername(
        extraction.id,
        { target: targets, filters: parsedFilters || {}, user_id, skipCoinCheck: true },
        (count: number) => {
          console.log(`[Worker] Progress callback: ${count}`);
          return updateProgress(count);
        },
        undefined,
        supabase
      );
      
      console.log('[Worker] Followers extraction finished for extraction ID:', extraction.id);
      
      // Implement refund mechanism if actual cost is less than estimated
      if (result?.actualCoinCost !== undefined) {
        console.log('[Worker] Checking for coin refund...');
        
        // Get the original job to see how much was deducted upfront
        const { data: extractionData, error: fetchError } = await supabase
          .from('extractions')
          .select('filters')
          .eq('id', extraction.id)
          .single();
        
        if (!fetchError && extractionData) {
          const originalFilters = typeof extractionData.filters === 'string' 
            ? JSON.parse(extractionData.filters) 
            : extractionData.filters;
          
          const coinLimit = originalFilters?.coinLimit ? parseInt(originalFilters.coinLimit) : null;
          
          // If there was a coin limit, check if we should refund
          if (coinLimit && result.actualCoinCost < coinLimit) {
            const refundAmount = coinLimit - result.actualCoinCost;
            console.log(`[Worker] Refunding ${refundAmount} coins (charged: ${coinLimit}, actual: ${result.actualCoinCost})`);
            
            try {
              // Add coins back to user account
              const { data: userData, error: coinsError } = await supabase
                .from("users")
                .select("coins")
                .eq("id", user_id)
                .single();
              
              if (!coinsError && userData) {
                const newBalance = userData.coins + refundAmount;
                const { error: updateError } = await supabase.rpc('update_user_coins', {
                  user_id: user_id,
                  new_coin_count: Math.floor(newBalance)
                });
                
                if (!updateError) {
                  console.log(`[Worker] Successfully refunded ${refundAmount} coins. New balance: ${newBalance}`);
                } else {
                  console.error('[Worker] Failed to refund coins:', updateError);
                }
              }
            } catch (refundError) {
              console.error('[Worker] Error during refund process:', refundError);
            }
          } else {
            console.log('[Worker] No refund needed. Actual cost matches or exceeds estimate.');
          }
        }
      }
      break;
    case 'following':
      console.log('[Worker] Starting following extraction');
      console.log('[Worker] Extraction ID:', extraction.id);
      console.log('[Worker] User ID:', user_id);
      console.log('[Worker] Target usernames:', targets);
      console.log('[Worker] Filters:', parsedFilters);
      
      const followingResult = await userFollowingChunkGqlByUsername(
        extraction.id,
        { target: targets, filters: parsedFilters || {}, user_id, skipCoinCheck: true },
        (count: number) => {
          console.log(`[Worker] Progress callback: ${count}`);
          return updateProgress(count);
        },
        undefined,
        supabase
      );
      
      console.log('[Worker] Following extraction finished for extraction ID:', extraction.id);
      
      // Implement refund mechanism if actual cost is less than estimated
      if (followingResult?.actualCoinCost !== undefined) {
        console.log('[Worker] Checking for coin refund...');
        
        // Get the original job to see how much was deducted upfront
        const { data: extractionData, error: fetchError } = await supabase
          .from('extractions')
          .select('filters')
          .eq('id', extraction.id)
          .single();
        
        if (!fetchError && extractionData) {
          const originalFilters = typeof extractionData.filters === 'string' 
            ? JSON.parse(extractionData.filters) 
            : extractionData.filters;
          
          const coinLimit = originalFilters?.coinLimit ? parseInt(originalFilters.coinLimit) : null;
          
          // If there was a coin limit, check if we should refund
          if (coinLimit && followingResult.actualCoinCost < coinLimit) {
            const refundAmount = coinLimit - followingResult.actualCoinCost;
            console.log(`[Worker] Refunding ${refundAmount} coins (charged: ${coinLimit}, actual: ${followingResult.actualCoinCost})`);
            
            try {
              // Add coins back to user account
              const { data: userData, error: coinsError } = await supabase
                .from("users")
                .select("coins")
                .eq("id", user_id)
                .single();
              
              if (!coinsError && userData) {
                const newBalance = userData.coins + refundAmount;
                const { error: updateError } = await supabase.rpc('update_user_coins', {
                  user_id: user_id,
                  new_coin_count: Math.floor(newBalance)
                });
                
                if (!updateError) {
                  console.log(`[Worker] Successfully refunded ${refundAmount} coins. New balance: ${newBalance}`);
                } else {
                  console.error('[Worker] Failed to refund coins:', updateError);
                }
              }
            } catch (refundError) {
              console.error('[Worker] Error during refund process:', refundError);
            }
          } else {
            console.log('[Worker] No refund needed. Actual cost matches or exceeds estimate.');
          }
        }
      }
      break;
    case 'posts':
      console.log('[Worker] Starting posts extraction');
      console.log('[Worker] Extraction ID:', extraction.id);
      console.log('[Worker] User ID:', user_id);
      console.log('[Worker] Target usernames:', targets);
      console.log('[Worker] Filters:', parsedFilters);

      // Call the posts extraction function, passing progress callback and supabase
      const postsResult = await getUserPosts(
        { target: targets, filters: parsedFilters || {}, user_id },
        (count: number) => {
          console.log(`[Worker] Progress callback: ${count}`);
          return updateProgress(count);
        },
        undefined, // onTotalEstimated
        supabase
      );
      console.log('[Worker] Posts extraction finished for extraction ID:', extraction.id);
      // Optionally: implement refund logic if you add actualCoinCost to getUserPosts
      break;
    case 'likers':
      console.log('[Worker] Starting likers extraction');
      console.log('[Worker] Extraction ID:', extraction.id);
      console.log('[Worker] User ID:', user_id);
      console.log('[Worker] Target URLs:', targets);
      console.log('[Worker] Filters:', parsedFilters);

      // Call the likers extraction function, passing extraction_id and supabase
  const { filteredLikers, errorMessages: likersErrorMessages } = await mediaLikersBulkV1(
        { urls: targets, filters: parsedFilters || {}, user_id },
        (count) => {
          console.log(`[Worker] Progress callback: ${count}`);
          return updateProgress(count);
        },
        undefined, // onTotalEstimated
        extraction.id,
        supabase
      );
      console.log('[Worker] Likers extraction finished for extraction ID:', extraction.id);

      // Implement refund mechanism if coin limit was set and actual cost is less than estimated
      // (Assume actualCoinCost is not available, so refund logic is skipped for now)

      if (likersErrorMessages && likersErrorMessages.length > 0) {
        console.warn('[Worker] Likers extraction error messages:', likersErrorMessages);
      }
      break;
    case 'commenters':
      console.log('[Worker] Starting commenters extraction');
      console.log('[Worker] Extraction ID:', extraction.id);
      console.log('[Worker] User ID:', user_id);
      console.log('[Worker] Target URLs:', targets);
      console.log('[Worker] Filters:', parsedFilters);

      // Call the commenters extraction function, passing user_id and supabase
  const { comments, errorMessages: commentersErrorMessages } = await extractCommentersBulkV2(
        { urls: targets, filters: parsedFilters || {}, user_id },
        (count) => {
          console.log(`[Worker] Progress callback: ${count}`);
          return updateProgress(count);
        },
        undefined, // onTotalEstimated
        supabase
      );
      if (commentersErrorMessages && commentersErrorMessages.length > 0) {
        console.warn('[Worker] Commenters extraction error messages:', commentersErrorMessages);
      }
      break;
    case 'hashtags':
      console.log('[Worker] Starting hashtags extraction');
      console.log('[Worker] Extraction ID:', extraction.id);
      console.log('[Worker] User ID:', user_id);
      // Always use the original user input (target_usernames) as the source for hashtags
      let hashtagsArr = typeof target_usernames === 'string'
        ? target_usernames.split(',').map(h => h.trim()).filter(Boolean)
        : Array.isArray(target_usernames)
          ? target_usernames.map(h => String(h).trim()).filter(Boolean)
          : [];
      console.log('[Worker] Hashtags (from user input):', hashtagsArr);
      console.log('[Worker] Filters:', parsedFilters);

      if (!hashtagsArr.length) {
        console.error('[Worker] No hashtags provided for extraction. Skipping job.');
        break;
      }

      // Call the hashtags extraction function, passing user_id and supabase
      const hashtagResult = await extractHashtagClipsBulkV2(
        { hashtags: hashtagsArr, filters: parsedFilters || {}, user_id },
        (count) => {
          console.log(`[Worker] Progress callback: ${count}`);
          return updateProgress(count);
        },
        undefined, // onTotalEstimated
        supabase
      );
      break;
    default:
      throw new Error(`Unsupported extraction_type: ${extraction_type}`);
  }
}

async function processExtraction(extraction: any) {
  const extractionId = extraction.id;
  try {
    // Lock the job (set status to 'processing' if still pending)
    const { data: locked, error: lockError } = await supabase
      .from('extractions')
      .update({ status: 'processing' })
      .eq('id', extractionId)
      .eq('status', 'pending')
      .select('id')
      .single();
    if (lockError || !locked) {
      console.log(`Extraction ${extractionId} already being processed or lock failed.`);
      return;
    }


  // Run real extraction logic
  await runExtractionJob(extraction);

    // Mark as completed
    await supabase
      .from('extractions')
      .update({ completed_at: new Date().toISOString(), status: 'completed', progress: 100 })
      .eq('id', extractionId);
    console.log(`Extraction ${extractionId} completed.`);
  } catch (err: any) {
    await supabase
      .from('extractions')
      .update({ status: 'failed', error_message: err.message })
      .eq('id', extractionId);
    console.error(`Extraction ${extractionId} failed:`, err);
  }
}


async function pollPendingExtractions() {
  console.log('[Worker] Polling for pending extractions...');
  while (!isShuttingDown) {
    console.log('[Worker] Checking for pending jobs...');
    const { data: extractions, error } = await supabase
      .from('extractions')
      .select('*')
      .in('status', ['pending'])
      .order('requested_at', { ascending: true })
      .limit(1);
    if (error) {
      console.error('[Worker] Error fetching extractions:', error);
      await new Promise((res) => setTimeout(res, 5000));
      continue;
    }
    if (extractions && extractions.length > 0) {
      console.log(`[Worker] Found pending extraction job: ID ${extractions[0].id}`);
      await processExtraction(extractions[0]);
    } else {
      console.log('[Worker] No pending jobs found. Sleeping...');
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
  console.log('[Worker] Worker stopped.');
}

console.log('[Worker] Extraction worker started.');
pollPendingExtractions();
