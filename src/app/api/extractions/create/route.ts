import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// Path alias configured in tsconfig.json ("@/*": ["./src/*"]) 
import { COIN_RULES, deductCoins, getUserCoins } from '@/utils/coinLogic';

// Initialize Supabase client (replace with your env vars or config)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Accept new structure: type, targets, filters
    const { type, targets, filters } = body;
    // You may want to get user_id from session/auth in production
    const user_id = body.user_id || null;
    
    console.log('[Extraction API] Request body:', { user_id, type, targets, filters });
    
    if (!user_id || !type || !Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Join all targets into a comma-separated string for target_usernames
    const target_usernames = Array.isArray(targets) ? targets.join(',') : String(targets);
    console.log('[Extraction API] target_usernames to save:', target_usernames);

    // Calculate coin cost based on extraction type and coin limit
    let coinCost = 0;
    const coinLimit = filters?.coinLimit ? parseInt(filters.coinLimit) : undefined;
    
    switch (type) {
      case 'followers':
        if (coinLimit) {
          coinCost = coinLimit; // Use the exact coin limit
        } else {
          // Get actual follower count to calculate accurate cost
          console.log('[Extraction API] Fetching follower counts for accurate pricing...');
          let totalFollowerCount = 0;
          
          for (const target of targets) {
            try {
              // Make a quick API call to get user info and follower count
              const response = await fetch(`${process.env.NEXT_PUBLIC_HIKER_API_URL || 'https://api.hikerapi.com'}/v1/user/by/username?username=${target.replace('@', '')}`, {
                headers: {
                  'x-access-key': process.env.NEXT_PUBLIC_HIKER_API_KEY!,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                const userData = await response.json();
                const followerCount = userData.follower_count || 0;
                totalFollowerCount += followerCount;
                console.log('[Extraction API] Target:', target, 'Followers:', followerCount);
              } else {
                console.warn('[Extraction API] Could not fetch follower count for:', target);
                // Use conservative estimate for failed lookups
                totalFollowerCount += 1000; // Assume 1k followers if lookup fails
              }
            } catch (error) {
              console.error('[Extraction API] Error fetching follower count for:', target, error);
              totalFollowerCount += 1000; // Conservative fallback
            }
          }
          
          // Calculate cost based on actual follower count
          // Cost = (followers / users_per_chunk) * coins_per_chunk + (followers * cost_per_user_for_filtering)
          const extractionCost = Math.ceil(totalFollowerCount / COIN_RULES.followers.perChunk.users) * COIN_RULES.followers.perChunk.coins;
          const filteringCost = totalFollowerCount * COIN_RULES.followers.perUser;
          coinCost = extractionCost + filteringCost;
          
          console.log('[Extraction API] Follower count:', totalFollowerCount, 'Extraction cost:', extractionCost, 'Filtering cost:', filteringCost, 'Total:', coinCost);
        }
        break;
      case 'following':
        if (coinLimit) {
          coinCost = coinLimit;
        } else {
          // Get actual following count for accurate pricing
          console.log('[Extraction API] Fetching following counts for accurate pricing...');
          let totalFollowingCount = 0;
          
          for (const target of targets) {
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_HIKER_API_URL || 'https://api.hikerapi.com'}/v1/user/by/username?username=${target.replace('@', '')}`, {
                headers: {
                  'x-access-key': process.env.NEXT_PUBLIC_HIKER_API_KEY!,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                const userData = await response.json();
                const followingCount = userData.following_count || 0;
                totalFollowingCount += followingCount;
                console.log('[Extraction API] Target:', target, 'Following:', followingCount);
              } else {
                totalFollowingCount += 1000; // Conservative estimate
              }
            } catch (error) {
              console.error('[Extraction API] Error fetching following count for:', target, error);
              totalFollowingCount += 1000; // Conservative fallback
            }
          }
          
          const extractionCost = Math.ceil(totalFollowingCount / COIN_RULES.following.perChunk.users) * COIN_RULES.following.perChunk.coins;
          const filteringCost = totalFollowingCount * COIN_RULES.following.perUser;
          coinCost = extractionCost + filteringCost;
          
          console.log('[Extraction API] Following count:', totalFollowingCount, 'Total cost:', coinCost);
        }
        break;
      case 'likers':
        if (coinLimit) {
          coinCost = coinLimit;
        } else {
          // For likers, we estimate based on URL count and average likes per post
          const urlCount = filters?.urls?.length || 1;
          const avgLikesPerPost = 100; // Conservative estimate
          const totalEstimatedLikers = urlCount * avgLikesPerPost;
          const extractionCost = Math.ceil(totalEstimatedLikers / COIN_RULES.likers.perChunk.users) * COIN_RULES.likers.perChunk.coins;
          const filteringCost = totalEstimatedLikers * COIN_RULES.likers.perUser;
          coinCost = extractionCost + filteringCost;
          console.log('[Extraction API] Estimated likers:', totalEstimatedLikers, 'Total cost:', coinCost);
        }
        break;
      case 'posts':
        coinCost = targets.length * COIN_RULES.posts.perPost; // Exact cost: 2 coins per target user
        if (coinLimit) {
          coinCost = Math.min(coinCost, coinLimit);
        }
        break;
      case 'commenters':
        if (coinLimit) {
          coinCost = coinLimit;
        } else {
          // For commenters, estimate based on URL count and average comments per post
          const urlCount = filters?.urls?.length || 1;
          const avgCommentsPerPost = 50; // Conservative estimate
          const totalEstimatedCommenters = urlCount * avgCommentsPerPost;
          const extractionCost = Math.ceil(totalEstimatedCommenters / COIN_RULES.commenters.perChunk.users) * COIN_RULES.commenters.perChunk.coins;
          coinCost = extractionCost;
          console.log('[Extraction API] Estimated commenters:', totalEstimatedCommenters, 'Total cost:', coinCost);
        }
        break;
      case 'hashtags':
        coinCost = (filters?.hashtags?.length || 1) * COIN_RULES.hashtags.perData; // Exact cost: 2 coins per hashtag
        if (coinLimit) {
          coinCost = Math.min(coinCost, coinLimit);
        }
        break;
      default:
        return NextResponse.json({ error: `Unsupported extraction type: ${type}` }, { status: 400 });
    }
    
    console.log('[Extraction API] Calculated coin cost:', coinCost);

    // Check if user has enough coins (but don't deduct yet - process route handles it)
    const userCoins = await getUserCoins(user_id, supabase);
    console.log('[Extraction API] User coins:', userCoins);
    
    if (userCoins < coinCost) {
      return NextResponse.json({ 
        error: `Insufficient coins. Required: ${coinCost}, Available: ${userCoins}` 
      }, { status: 400 });
    }

    console.log('[Extraction API] Coin check passed. Coins will be deducted during processing.');

    // Store all parameters for downstream extraction
    const { data, error } = await supabase
      .from('extractions')
      .insert([
        {
          user_id,
          extraction_type: type,
          target_usernames, // only use plural column
          filters: filters ? JSON.stringify(filters) : null,
          status: 'pending',
          progress: 0,
          requested_at: new Date().toISOString(),
        },
      ])
      .select('id, status, progress')
      .single();

    if (error) {
      console.error('[Extraction API] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Extraction API] Successfully created extraction:', data);
    return NextResponse.json({ id: data.id, status: data.status, progress: data.progress }, { status: 201 });
  } catch (err: unknown) {
    let message = 'Unknown error';
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      message = (err as { message: string }).message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
