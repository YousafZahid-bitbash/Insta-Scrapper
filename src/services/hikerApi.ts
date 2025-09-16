  // Type for hashtag clip objects
  type HashtagClip = {
    id?: string;
    pk?: string;
    media_url?: string;
    video_url?: string;
    image_url?: string;
    taken_at?: number;
    like_count?: number;
    caption?: string | { text?: string };
    caption_text?: string;
    hashtags?: string[] | string;
    username?: string;
    user?: {
      username?: string;
      full_name?: string;
      profile_pic_url?: string;
      is_verified?: boolean;
      is_private?: boolean;
    };
    media?: HashtagClip; // Allow nested media objects
    image_versions2?: {
      candidates?: { url?: string }[];
    };
  };

  /**************************************************/
 /* Type for extracted commenters (for DB insert)  */
/**************************************************/ 

export interface ExtractedCommenter {
  comment_id: string;
  media_id: string;
  user_id: string;
  username: string;
  full_name: string;
  profile_pic_url: string;
  is_private: boolean | null;
  is_verified: boolean | null;
  is_mentionable: boolean | null;
  comment_text: string;
  like_count: number;
  created_at: string | null;
  parent_comment_id: string | null;
  extraction_id?: string;
}



// Type definitions for user extraction
export interface UserDetails {
  username: string;
  full_name: string;
  profile_pic_url?: string;
  is_private?: boolean;
  is_verified?: boolean;
  is_business?: boolean;
  public_phone_number?: string;
  contact_phone_number?: string;
  public_email?: string;
  link_in_bio?: string;
  pk?: string;
  biography?: string;
  follower_count?: number;
  following_count?: number;
}

export interface ExtractedUser {
  username: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  link_in_bio?: string | null;
  extraction_id?: string;
  pk?: string;
  profile_pic_url?: string;
  is_private?: boolean;
  is_verified?: boolean;
  is_business?: boolean;
}

import { HikerUser, FilterOptions } from "../utils/types";
import axios, { AxiosInstance } from "axios";
// Conditional import to avoid environment issues in worker context
import type { SupabaseClient } from '@supabase/supabase-js';
let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined' || process.env.NEXT_PUBLIC_SUPABASE_URL) {
  import("../supabaseClient").then(mod => {
    supabase = mod.supabase;
  }).catch(() => {
    console.log('[hikerApi] Supabase client not available, will use passed clients');
  });
}
import { COIN_RULES, deductCoins, getUserCoins } from "../utils/coinLogic";
import { SignJWT, jwtVerify, JWTPayload } from "jose";

const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || "b753b7d56575d996e1f59e0f94f3d005";
const encoder = new TextEncoder();
const getSecret = () => encoder.encode(JWT_SECRET);

export interface JWTUserPayload {
  user_id: string;
  email: string;
  iat?: number;
  exp?: number;
}

export async function generateJWT(payload: Record<string, unknown>): Promise<string> {
  return await new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyJWT(token: string): Promise<JWTUserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JWTUserPayload;
  } catch {
    return null;
  }
}
const HIKER_API_URL = process.env.NEXT_PUBLIC_HIKER_API_URL || "https://api.hikerapi.com";


console.log("[hikerApi] process.env.NEXT_PUBLIC_HIKER_API_KEY:", process.env.NEXT_PUBLIC_HIKER_API_KEY);
console.log("[hikerApi] process.env.HIKER_API_KEY:", process.env.HIKER_API_KEY);
console.log("[hikerApi] process.env.NODE_ENV:", process.env.NODE_ENV);

// Lazy initialization of Hiker client
let hikerClient: AxiosInstance | null = null;

function getHikerClient(): AxiosInstance {
  if (!hikerClient) {
    const HIKER_API_KEY = process.env.NEXT_PUBLIC_HIKER_API_KEY;
    console.log("[hikerApi] HIKER_API_KEY (assigned):", HIKER_API_KEY);

    if (!HIKER_API_KEY) {
      throw new Error("NEXT_PUBLIC_HIKER_API_KEY is not set in environment variables");
    }

    hikerClient = axios.create({
      baseURL: HIKER_API_URL,
      headers: {
        "x-access-key": HIKER_API_KEY,
        "Content-Type": "application/json",
      },
    });
  }
  return hikerClient;
}



// Get user object by username (returns user info, including pk as user_id)
export async function userByUsernameV1(username: string): Promise<HikerUser | undefined> {
  try {
    const params = { username };
    const res = await getHikerClient().get("/v1/user/by/username", { params });
    return res.data;
  } catch (error: unknown) {
    console.error('[hikerApi] userFollowersChunkGql actual error:', error);
    handleHikerError(error);
  }
}


/***********************************************************/
/**                FOLLOWERS API CALL METHOD              **/
/***********************************************************/

// Get a user's followers (one page) with cursor
export async function getFollowersPage(
  userPk: string,
  page_id?: string
): Promise<{ items: { pk: string; username: string; full_name: string; profile_pic_url: string; is_private: boolean; is_verified: boolean }[]; next_page_id?: string }> {
  const params: Record<string, unknown> = { user_id: userPk };
  if (page_id) params.page_id = page_id;
  const res = await getHikerClient().get("/v2/user/followers", { params });
  const data = res.data ?? {};
  const items = Array.isArray(data?.response?.users) ? data.response.users : [];
  const nextPageId = typeof data?.next_page_id === 'string' && data.next_page_id
    ? data.next_page_id
    : (typeof data?.response?.next_page_id === 'string' && data.response.next_page_id ? data.response.next_page_id : undefined);
  return { items, next_page_id: nextPageId };
}

// Single-page followings fetch for batching (no internal loops)
export async function getFollowingPage(
  userPk: string,
  page_id?: string
): Promise<{ items: { pk: string; username: string; full_name: string; profile_pic_url: string; is_private: boolean; is_verified: boolean }[]; next_page_id?: string }> {
  const params: Record<string, unknown> = { user_id: userPk };
  if (page_id) params.page_id = page_id;
  const res = await getHikerClient().get("/v2/user/following", { params });
  const data = res.data ?? {};
  const items = Array.isArray(data?.response?.users) ? data.response.users : [];
  const nextPageId = typeof data?.next_page_id === 'string' && data.next_page_id
    ? data.next_page_id
    : (typeof data?.response?.next_page_id === 'string' && data.response.next_page_id ? data.response.next_page_id : undefined);
  return { items, next_page_id: nextPageId };
}

// Helper: Save extracted users to DB, linking to extraction_id
async function saveExtractedUsersToDB(users: ExtractedUser[], extraction_id: string, supabase: SupabaseClient) {
  if (!users.length) return;
  for (const user of users) {
    user.extraction_id = extraction_id;
  }
  const { error } = await supabase
    .from('extracted_users')
    .insert(users);
  if (error) {
    console.error('[hikerApi] Error saving extracted users:', error);
  }
}

/**
 * Clean followers extraction: fetch, filter, and save users, linking to existing extraction_id.
 * - extraction_id: The job's extraction row ID (created by API route/worker)
 * - payload: { target, filters, ... }
 * - onProgress: callback for progress updates
 * - supabase: Supabase client instance
 */
export async function userFollowersChunkGqlByUsername(
  extraction_id: string,
  payload: { 
    target: string | string[], 
    filters: FilterOptions, 
    force?: boolean, 
    end_cursor?: string,
    user_id?: string,
    skipCoinCheck?: boolean
  },
  onProgress?: (count: number) => void,
  onTotalEstimated?: (total: number) => void,
  supabase?: SupabaseClient
): Promise<{ filteredFollowers: ExtractedUser[], actualCoinCost?: number }> {
  const { target, filters, force, end_cursor, user_id, skipCoinCheck } = payload;
  console.log('[Followers Extraction] Raw target:', target);
  let usernames = Array.isArray(target) ? target : [target];
  // Clean up usernames: remove empty/undefined, trim, split by newlines if needed
  usernames = usernames
    .flatMap(u => typeof u === 'string' ? u.split(/\r?\n/) : [])
    .map(u => u.trim())
    .filter(u => !!u);
  console.log('[Followers Extraction] Cleaned usernames:', usernames);
  const userIds: string[] = [];
  let totalEstimated = 0;
  // Resolve usernames to user IDs
  for (const uname of usernames) {
    if (!uname) {
      console.warn('[Followers Extraction] Skipping undefined or empty username');
      continue;
    }
    console.log('[Followers Extraction] Processing username:', uname);
    const cleanUsername = uname.replace(/^@/, "");
    const user = await userByUsernameV1(cleanUsername);
    if (!user || !user.pk) {
      console.error(`[hikerApi] User not found for username:`, cleanUsername);
      continue;
    }
    userIds.push(user.pk);
    totalEstimated += user.follower_count || 0;
    console.log('[Followers Extraction] Got user_id:', user.pk, 'for username:', cleanUsername);
  }

  if (userIds.length === 0) {
    throw new Error("No valid user IDs found for provided usernames");
  }

  // Call total estimation callback
  if (onTotalEstimated) onTotalEstimated(totalEstimated);

  // Fetch followers (no DB save inside this function)
  const filtersRecord: Record<string, FilterOptions> = { followers: filters };
  const gqlResult = await userFollowersChunkGql(
    userIds, force, end_cursor, usernames.join(","), filtersRecord, onProgress, user_id, skipCoinCheck
  );
  const filteredFollowers: ExtractedUser[] = Array.isArray(gqlResult?.filteredFollowers)
    ? gqlResult.filteredFollowers.map(f => ({
        ...f,
        is_business: f.is_business === null ? undefined : f.is_business
      }))
    : [];
  
  // Calculate actual coin cost based on extracted data
  const extractedCount = filteredFollowers.length;
  const extractionCost = Math.ceil(extractedCount / COIN_RULES.followers.perChunk.users) * COIN_RULES.followers.perChunk.coins;
  const filteringCost = extractedCount * COIN_RULES.followers.perUser;
  const actualCoinCost = extractionCost + filteringCost;
  
  console.log(`[Followers Extraction] Actual coin cost calculation: extracted=${extractedCount}, extraction=${extractionCost}, filtering=${filteringCost}, total=${actualCoinCost}`);
  
  // Save to DB, linking to the provided extraction_id
  if (supabase && filteredFollowers.length > 0) {
    await saveExtractedUsersToDB(filteredFollowers, extraction_id, supabase);
  }
  return { filteredFollowers, actualCoinCost };
}

// Original function (still available if you already have user_id)
export async function userFollowersChunkGql(
  user_id: string | string[], 
  force?: boolean, 
  end_cursor?: string, 
  target_username?: string | string[], 
  filters?: Record<string, FilterOptions>, 
  onProgress?: (count: number) => void,
  override_user_id?: string,
  skipCoinCheck?: boolean
) {
  try {
    type Follower = {
      pk: string;
      username: string;
      full_name: string;
      profile_pic_url: string;
      is_private: boolean;
      is_verified: boolean;
    };
    const allFollowers: Follower[] = [];
    let pageCount = 0;
    const userId = override_user_id || (typeof window !== "undefined" ? localStorage.getItem("user_id") : null); // Get user ID from local storage or use override
    const userIdStr = userId ?? "";
  if (!supabase) throw new Error("Supabase client not initialized");
  let coins = skipCoinCheck ? Infinity : await getUserCoins(userIdStr, supabase);
    let stopExtraction = false;
    let usersExtracted = 0;
  // Get coin limit from filters (integer, no decimals)
  const coinLimit = filters?.followers?.coinLimit ? Math.floor(filters.followers.coinLimit) : undefined;
  
  // Calculate maximum users we can afford within coin limit (extraction + filtration costs)
  let maxUsersWithinCoinLimit: number | undefined = undefined;
  if (coinLimit !== undefined) {
    const extractionCostPerUser = COIN_RULES.followers.perChunk.coins / COIN_RULES.followers.perChunk.users; // 0.1
    const filtrationCostPerUser = COIN_RULES.followers.perUser; // 1.0
    const totalCostPerUser = extractionCostPerUser + filtrationCostPerUser; // 1.1
    maxUsersWithinCoinLimit = Math.floor(coinLimit / totalCostPerUser);
    console.log(`[hikerApi] [FollowersV2] Coin limit: ${coinLimit}, Max users within budget: ${maxUsersWithinCoinLimit} (${totalCostPerUser} coins per user)`);
  }
    const userIds = Array.isArray(user_id) ? user_id : [user_id];
    const errorMessages: string[] = [];
    const validUserIds: string[] = [...userIds];
    for (let i = 0; i < validUserIds.length; i++) {
      const singleUserId = validUserIds[i];
      let nextPageId: string | undefined = undefined;
      try {
        let users: Follower[] = [];
        do {
          const params: Record<string, unknown> = { user_id: singleUserId };
          if (nextPageId) params.page_id = nextPageId;
          const res = await getHikerClient().get("/v2/user/followers", { params });
          const data = res.data;
          users = data && data.response && Array.isArray(data.response.users) ? data.response.users : [];
          
          // Process users and deduct coins in batches according to COIN_RULES
          if (users.length > 0) {
            console.log(`[hikerApi] [FollowersV2] Processing ${users.length} users from API response`);
            let usersProcessedInBatch = 0;
            
            for (const user of users) {
              // If coin limit is set, stop when usersExtracted reaches maxUsersWithinCoinLimit
              if (maxUsersWithinCoinLimit !== undefined && usersExtracted >= maxUsersWithinCoinLimit) {
                stopExtraction = true;
                break;
              }
              
              // Check if we have enough coins for the full batch
              if (usersProcessedInBatch === 0 && coins < COIN_RULES.followers.perChunk.coins) {
                stopExtraction = true;
                break;
              }
              
              allFollowers.push(user);
              usersExtracted++;
              usersProcessedInBatch++;
              if (onProgress) onProgress(allFollowers.length);
              
              // Deduct coins when we complete a full batch (every 10 users)
              if (usersProcessedInBatch >= COIN_RULES.followers.perChunk.users) {
                if (!skipCoinCheck) {
                  console.log(`[hikerApi] [FollowersV2] Deducting ${COIN_RULES.followers.perChunk.coins} coins for batch of ${COIN_RULES.followers.perChunk.users} users`);
                  if (!supabase) throw new Error("Supabase client not initialized");
                  coins = await deductCoins(userIdStr, COIN_RULES.followers.perChunk.coins, supabase);
                } else {
                  console.log(`[hikerApi] [FollowersV2] Skipping coin deduction for batch (worker mode)`);
                }
                usersProcessedInBatch = 0; // Reset batch counter
              }
            }
            
            // Deduct coins for any remaining partial batch
            if (usersProcessedInBatch > 0 && !stopExtraction) {
              if (!skipCoinCheck) {
                console.log(`[hikerApi] [FollowersV2] Deducting ${COIN_RULES.followers.perChunk.coins} coins for partial batch of ${usersProcessedInBatch} users`);
                if (!supabase) throw new Error("Supabase client not initialized");
                coins = await deductCoins(userIdStr, COIN_RULES.followers.perChunk.coins, supabase);
              } else {
                console.log(`[hikerApi] [FollowersV2] Skipping coin deduction for partial batch (worker mode)`);
              }
            }
            
            console.log(`[hikerApi] [FollowersV2] Extracted ${usersExtracted} users so far. Max users allowed: ${maxUsersWithinCoinLimit ?? 'unlimited'}`);
            if (stopExtraction) break;
            pageCount++;
          }
          if (users.length === 0) {
            console.warn(`[hikerApi] [FollowersV2] Empty or invalid response for user_id ${singleUserId}, skipping coin deduction and DB save for this page.`);
          }
          nextPageId = typeof data.next_page_id === 'string' && data.next_page_id ? data.next_page_id : undefined;
          console.log(`[hikerApi] [FollowersV2] Next page id for user_id ${singleUserId}:`, nextPageId);
        } while (nextPageId && !stopExtraction);
      } catch (err) {
        if (typeof err === 'object' && err !== null && 'response' in err) {
          const response = (err as { response?: { status?: number } }).response;
          if (response && (response.status === 404 || response.status === 403)) {
            // Skip this user and continue with others
            console.warn(`[hikerApi] [FollowersV2] Skipping invalid user_id ${singleUserId} due to ${response.status}`);
            continue;
          }
        }
        // For other errors, rethrow
        else {
          throw err;
        }
      }
      if (stopExtraction) break;
    }
  const safeFilters = filters || {};
  // Pick the correct filter options object (followers)
  const filterOptions = safeFilters.followers || {};
  console.log('[Backend] [userFollowersChunkGql] Filters received:', filterOptions);
  console.log('[Backend] Starting filtering process. Total users before filtering:', allFollowers.length);
  // Deduct coins for allFollowers before calling extractFilteredUsers
  const perUserTotalCost = allFollowers.length * COIN_RULES.followers.perUser; // Calculate total cost based on followers
  if (!skipCoinCheck) {
    if (coins < perUserTotalCost) {
      stopExtraction = true;
    } else {
  if (!supabase) throw new Error("Supabase client not initialized");
  coins = await deductCoins(userIdStr, perUserTotalCost, supabase);
    }
  } else {
    console.log(`[hikerApi] [FollowersV2] Skipping per-user coin deduction (worker mode) - would deduct ${perUserTotalCost} coins for ${allFollowers.length} users`);
  }
  const result = await extractFilteredUsers(
    allFollowers,
    filterOptions,
    async (username: string): Promise<UserDetails> => (await getHikerClient().get("/v1/user/by/username", { params: { username } })).data as UserDetails
  );
    // Ensure all required columns are present for each user
    const filteredFollowers = result.map((user: ExtractedUser) => ({
      pk: user.pk,
      username: user.username,
      full_name: user.full_name,
      profile_pic_url: user.profile_pic_url,
      is_private: user.is_private,
      is_verified: user.is_verified,
      email: filterOptions.extractEmail ? user.email ?? null : null,
      phone: filterOptions.extractPhone ? user.phone ?? null : null,
      link_in_bio:filterOptions.extractLinkInBio ? user.link_in_bio ?? null : null,
      is_business: typeof user.is_business !== 'undefined' ? user.is_business : null,
      // extraction_id will be added before DB insert
    }));
    console.log('[Backend] Filtering complete. Total users after filtering:', filteredFollowers.length);
    console.log('[Backend] Filters used:', filterOptions);
    console.log(`[hikerApi] [FollowersV2] Total followers collected:`, allFollowers.length);
    // Save extraction and extracted users to DB only if followers found
  if (userIdStr && filteredFollowers.length > 0) {
      try {
  if (!supabase) throw new Error("Supabase client not initialized");
  const { data: extraction, error: extractionError } = await supabase
          .from("extractions")
          .insert([
            {
              user_id: userId,
              extraction_type: "followers",
              target_usernames: target_username || null,
              target_user_id: Array.isArray(user_id) ? user_id.join(",") : user_id,
              requested_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
              status: stopExtraction ? "stopped" : "completed",
              page_count: pageCount,
              next_page_id: null,
              error_message: stopExtraction ? "Stopped due to insufficient coins" : null,
            },
          ])
          .select()
          .single();
        if (extractionError) {
          console.error("[hikerApi] Error saving extraction:", extractionError);
        } else if (extraction && extraction.id) {
          for (const user of filteredFollowers) {
            (user as ExtractedUser).extraction_id = extraction.id;
          }
          if (filteredFollowers.length > 0) {
            if (!supabase) throw new Error("Supabase client not initialized");
            const { error: usersError } = await supabase
              .from("extracted_users")
              .insert(filteredFollowers);
            if (usersError) {
              console.error("[hikerApi] Error saving extracted users:", usersError);
            }
          }
        }
      } catch (err) {
        console.error("[hikerApi] Exception during DB save:", err);
      }
    } else {
      console.warn(`[hikerApi] [FollowersV2] No filtered followers found, skipping DB save and coin deduction.`);
    }
  return { filteredFollowers, errorMessages };
  } catch (error: unknown) {
  // Only handle unexpected errors
  console.error('[hikerApi] userFollowersChunkGqlV2 actual error:', error);
  handleHikerError(error);
  }
}


/***********************************************************/
/**                FOLLOWING API CALL METHOD              **/
/***********************************************************/


// Get a user's followings (one page) with cursor
// Get a user's followings by username (fetches user_id first)
/**
 * Accepts frontend payload: { target: string | string[], filters: FilterOptions }
 * Resolves user_id(s), fetches followings, filters, and saves to DB.
 */
export async function userFollowingChunkGqlByUsername(
  extraction_id: number | null,
  payload: { target: string | string[], filters: FilterOptions, force?: boolean, end_cursor?: string, user_id?: string, skipCoinCheck?: boolean },
  onProgress?: (count: number) => void,
  onTotalEstimated?: (total: number) => void,
  supabaseClient?: SupabaseClient | null
): Promise<{ filteredFollowings: ExtractedUser[], actualCoinCost?: number }> {
  const { target, filters, force, end_cursor, user_id, skipCoinCheck = false } = payload;
  console.log(`[hikerApi] userFollowingChunkGqlByUsername called with target(s):`, target, 'force:', force, 'end_cursor:', end_cursor);
  console.log('[hikerApi] [userFollowingChunkGqlByUsername] Filters received:', filters);
  console.log('[hikerApi] [userFollowingChunkGqlByUsername] extraction_id:', extraction_id, 'skipCoinCheck:', skipCoinCheck);
  
  // Use the provided supabase client or default to global
  const supabaseToUse = supabaseClient || supabase;
  // Support both single username and array of usernames
  const usernames = Array.isArray(target) ? target : [target];
  const userIds: string[] = [];
  let totalEstimated = 0;
  
  for (const uname of usernames) {
    const cleanUsername = uname.replace(/^@/, "");
    const user = await userByUsernameV1(cleanUsername);
    console.log(`[hikerApi] userByUsernameV1 result for ", cleanUsername, ":`, user);
    if (!user || !user.pk) {
      console.error(`[hikerApi] User not found for username:`, cleanUsername);
      continue; // Skip missing users, don't throw
    }
    userIds.push(user.pk);
    totalEstimated += user.following_count || 0;
  }
  if (userIds.length === 0) {
    throw new Error("No valid user IDs found for provided usernames");
  }

  // Call total estimation callback
  if (onTotalEstimated) {
    console.log(`[hikerApi] Total following estimated: ${totalEstimated}`);
    onTotalEstimated(totalEstimated);
  }
  
  // Wrap filters in a Record<string, FilterOptions> for compatibility
  const filtersRecord: Record<string, FilterOptions> = { following: filters };
  if (!supabaseToUse) throw new Error("Supabase client not initialized");
  return userFollowingChunkGql(userIds, force, end_cursor, usernames.join(","), filtersRecord, onProgress, extraction_id, user_id, skipCoinCheck, supabaseToUse);
}

// Original function (still available if you already have user_id)
export async function userFollowingChunkGql(
  user_id: string | string[],
  force?: boolean,
  end_cursor?: string,
  target_username?: string,
  filters?: Record<string, FilterOptions>,
  onProgress?: (count: number) => void,
  extraction_id?: number | null,
  worker_user_id?: string,
  skipCoinCheck?: boolean,
  supabaseClient?: SupabaseClient
): Promise<{ filteredFollowings: ExtractedUser[], actualCoinCost?: number }> {
  try {
    type Following = {
      pk: string;
      username: string;
      full_name: string;
      profile_pic_url: string;
      is_private: boolean;
      is_verified: boolean;
    };
  const allFollowings: Following[] = [];
  let pageCount = 0;
  
  // Use the provided supabase client or default to global
  const supabaseToUse = supabaseClient || supabase;
  
  // Coin checking setup - skip if in worker context
  let coins: number = 0;
  let stopExtraction: boolean = false;
  let userIdStr: string = "";
  
  if (!supabaseToUse) throw new Error("Supabase client not initialized");
  if (!skipCoinCheck) {
    const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : (worker_user_id || null);
    userIdStr = userId ?? "";
    coins = await getUserCoins(userIdStr, supabaseToUse);
    console.log('[hikerApi] [userFollowingChunkGql] Coin checking enabled, current coins:', coins);
  } else {
    console.log('[hikerApi] [userFollowingChunkGql] Coin checking disabled (worker context)');
    // In worker context, use the provided user_id for database operations
    userIdStr = worker_user_id || "";
  }
  const userIds = Array.isArray(user_id) ? user_id : [user_id];
    for (const singleUserId of userIds) {
      let nextPageId: string | undefined = undefined;
      try {
        let users: Following[] = [];
        do {
          const params: Record<string, unknown> = { user_id: singleUserId };
          if (nextPageId) params.page_id = nextPageId;
          const res = await getHikerClient().get("/v2/user/following", { params });
          const data = res.data;
          users = data && data.response && Array.isArray(data.response.users) ? data.response.users : [];
          // Log users array immediately after assignment
          console.log('[hikerApi] [userFollowingChunkGql] After assignment, users array length:', users.length, 'Usernames:', users.map(u => u.username));
          
          // Process users and deduct coins in batches according to COIN_RULES
          if (users.length > 0) {
            console.log(`[hikerApi] [FollowingV2] Processing ${users.length} users from API response`);
            let usersProcessedInBatch = 0;
            let usersExtracted = 0;
            
            // Get coin limit from filters (integer, no decimals)
            const coinLimit = filters?.following?.coinLimit ? Math.floor(filters.following.coinLimit) : undefined;
            
            // Calculate maximum users we can afford within coin limit (extraction + filtration costs)
            let maxUsersWithinCoinLimit: number | undefined = undefined;
            if (coinLimit !== undefined) {
              const extractionCostPerUser = COIN_RULES.followings.perChunk.coins / COIN_RULES.followings.perChunk.users; // 0.1
              const filtrationCostPerUser = COIN_RULES.followings.perUser; // 1.0
              const totalCostPerUser = extractionCostPerUser + filtrationCostPerUser; // 1.1
              maxUsersWithinCoinLimit = Math.floor(coinLimit / totalCostPerUser);
              console.log(`[hikerApi] [FollowingV2] Coin limit: ${coinLimit}, Max users within budget: ${maxUsersWithinCoinLimit} (${totalCostPerUser} coins per user)`);
            }
            
            console.log(`[hikerApi] [FollowingV2] Entering user loop. users.length: ${users.length}`);
            if (users.length > 0) {
              console.log('[hikerApi] [FollowingV2] Usernames in users:', users.map(u => u.username));
            }
            for (const user of users) {
              // Check if we have enough coins for the full batch (skip in worker context)
              if (!skipCoinCheck && usersProcessedInBatch === 0 && coins < COIN_RULES.followings.perChunk.coins) {
                console.log(`[hikerApi] [FollowingV2] Not enough coins for batch, stopping extraction.`);
                stopExtraction = true;
                break;
              }
              allFollowings.push(user);
              console.log(`[hikerApi] [FollowingV2] Added user to allFollowings:`, user.username);
              usersExtracted++;
              usersProcessedInBatch++;
              console.log(`[hikerApi] [FollowingV2] usersExtracted: ${usersExtracted}, maxUsersWithinCoinLimit: ${maxUsersWithinCoinLimit}`);
              if (onProgress) onProgress(allFollowings.length);
              // If coin limit is set, stop when usersExtracted >= maxUsersWithinCoinLimit
              if (maxUsersWithinCoinLimit !== undefined && usersExtracted >= maxUsersWithinCoinLimit) {
                console.log(`[hikerApi] [FollowingV2] Reached max users within coin limit: ${maxUsersWithinCoinLimit}`);
                stopExtraction = true;
                break;
              }
              // Deduct coins when we complete a full batch (every 10 users)
              if (usersProcessedInBatch >= COIN_RULES.followings.perChunk.users && !skipCoinCheck) {
                console.log(`[hikerApi] [FollowingV2] Deducting ${COIN_RULES.followings.perChunk.coins} coins for batch of ${COIN_RULES.followings.perChunk.users} users`);
                coins = await deductCoins(userIdStr, COIN_RULES.followings.perChunk.coins, supabaseToUse);
                usersProcessedInBatch = 0; // Reset batch counter
              }
            }
            // Log allFollowings after each batch
            console.log('[hikerApi] [FollowingV2] allFollowings after batch:', allFollowings.length, allFollowings.map(u => u.username));
            if (stopExtraction) {
              console.log('[hikerApi] [FollowingV2] stopExtraction is TRUE after user loop. Reason: batch/coin/limit logic triggered.');
            }
            
            // Deduct coins for any remaining partial batch
            if (usersProcessedInBatch > 0 && !stopExtraction && !skipCoinCheck) {
              console.log(`[hikerApi] [FollowingV2] Deducting ${COIN_RULES.followings.perChunk.coins} coins for partial batch of ${usersProcessedInBatch} users`);
              coins = await deductCoins(userIdStr, COIN_RULES.followings.perChunk.coins, supabaseToUse);
            }
            
            if (stopExtraction) break;
            pageCount++;
          }
          if (users.length === 0) {
            console.warn(`[hikerApi] [FollowingV2] Empty or invalid response for user_id ${singleUserId}, skipping coin deduction and DB save for this page.`);
          }
          nextPageId = typeof data.next_page_id === 'string' && data.next_page_id ? data.next_page_id : undefined;
          console.log(`[hikerApi] [FollowingV2] Next page id for user_id ${singleUserId}:`, nextPageId);
        } while (nextPageId && !stopExtraction);
      } catch (err) {
        if (typeof err === 'object' && err !== null && 'response' in err) {
          const response = (err as { response?: { status?: number } }).response;
          if (response && (response.status === 404 || response.status === 403)) {
            let msg = '';
            if (response.status === 404) {
              msg = `User is private or not found (404): user_id ${singleUserId}. Data extraction can't be done.`;
            } else if (response.status === 403) {
              msg = `User is private or forbidden (403): user_id ${singleUserId}. Data extraction can't be done.`;
            }
            console.warn(`[hikerApi] [FollowingV2] ${msg}`);
            // For frontend display, you may want to collect these errors as well
            // errorMessages.push(msg); // Uncomment if you want to collect errors for followings too
            if (userIds.length === 1) {
              throw { type: response.status === 404 ? 'single-404' : 'single-403', message: msg, userId: singleUserId };
            } else {
              throw { type: response.status === 404 ? 'multi-404' : 'multi-403', message: msg, userId: singleUserId, remainingUserIds: userIds.filter(id => id !== singleUserId) };
            }
          }
        }
        else {
          throw err;
        }
      }
      if (stopExtraction) break;
    }
  const safeFilters = filters || {};
  // Pick the correct filter options object (following)
  const filterOptions = safeFilters.following || {};
  console.log('[Backend] [userFollowingChunkGql] Filters received:', filterOptions);
  console.log('[Backend] Starting filtering process. Total users before filtering:', allFollowings.length);
  // Deduct coins for allFollowings before calling extractFilteredUsers
  const perUserTotalCost = allFollowings.length * COIN_RULES.followings.perUser;
  if (!skipCoinCheck && coins < perUserTotalCost) {
    stopExtraction = true;
  } else if (!skipCoinCheck) {
    coins = await deductCoins(userIdStr, perUserTotalCost, supabaseToUse);
  }
  console.log('[hikerApi] [FollowingV2] allFollowings before filtering:', allFollowings.map(u => u.username));
  const result = await extractFilteredUsers(
    allFollowings,
    filterOptions,
    async (username: string): Promise<UserDetails> => (await getHikerClient().get("/v1/user/by/username", { params: { username } })).data as UserDetails
  );
    // Ensure all required columns are present for each user
    const filteredFollowings = result.map((user: ExtractedUser) => ({
      pk: user.pk,
      username: user.username,
      full_name: user.full_name,
      profile_pic_url: user.profile_pic_url,
      is_private: user.is_private,
      is_verified: user.is_verified,
      email: filterOptions.extractEmail ? user.email ?? null : null,
      phone: filterOptions.extractPhone ? user.phone ?? null : null,
      link_in_bio: filterOptions.extractLinkInBio ? user.link_in_bio ?? null : null,
      is_business: typeof user.is_business !== 'undefined' ? user.is_business : null,
      // extraction_id will be added before DB insert
      ...(() => {
        console.log('[Mapping Followings] username:', user.username, 'phone:', filterOptions.extractPhone ? user.phone ?? null : null, 'email:', filterOptions.extractEmail ? user.email ?? null : null, 'link_in_bio:', filterOptions.extractLinkInBio ? user.link_in_bio ?? null : null);
        return {};
      })()
    }));
    console.log('[Backend] Filtering complete. Total users after filtering:', filteredFollowings.length);
    console.log('[Backend] Filters used:', filterOptions);
    console.log(`[hikerApi] [FollowingV2] Total followings collected:`, allFollowings.length);
    // Save extraction and extracted users to DB only if followings found
  if (userIdStr && filteredFollowings.length > 0) {
    if (!supabaseToUse) throw new Error("Supabase client not initialized");
    try {
      let extractionId = extraction_id;
      // If no extraction_id provided (direct frontend call), create new extraction record
      if (!extractionId) {
        const { data: extraction, error: extractionError } = await supabaseToUse
          .from("extractions")
          .insert([
            {
              user_id: userIdStr,
              extraction_type: "following",
              target_usernames: target_username || null,
              target_user_id: Array.isArray(user_id) ? user_id.join(",") : user_id,
              requested_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
              status: "completed",
              page_count: pageCount,
              next_page_id: null,
              error_message: null,
            },
          ])
          .select()
          .single();
        if (extractionError) {
          console.error("[hikerApi] Error saving extraction:", extractionError);
          // Calculate actual coin cost for error case
          const extractionCost = Math.ceil(allFollowings.length / COIN_RULES.followings.perChunk.users) * COIN_RULES.followings.perChunk.coins;
          const filteringCost = allFollowings.length * COIN_RULES.followings.perUser;
          const actualCoinCost = extractionCost + filteringCost;
          return { filteredFollowings: allFollowings as ExtractedUser[], actualCoinCost };
        }
        extractionId = extraction?.id;
      } else {
        // Update existing extraction record with completion info
        await supabaseToUse
          .from("extractions")
          .update({
            completed_at: new Date().toISOString(),
            status: "completed",
            page_count: pageCount,
            next_page_id: null,
            error_message: null,
          })
          .eq('id', extractionId);
      }
      if (extractionId) {
        // Add extraction_id to all users
        for (const user of filteredFollowings) {
          (user as ExtractedUser).extraction_id = String(extractionId);
        }
        // Insert extracted users
        if (filteredFollowings.length > 0) {
          const { error: usersError } = await supabaseToUse
            .from("extracted_users")
            .insert(filteredFollowings);
          if (usersError) {
            console.error("[hikerApi] Error saving extracted users:", usersError);
          } else {
            console.log(`[hikerApi] Successfully saved ${filteredFollowings.length} following users for extraction ${extractionId}`);
          }
        }
      }
    } catch (err) {
      console.error("[hikerApi] Exception during DB save:", err);
    }
  } else {
    console.warn(`[hikerApi] [FollowingV2] No filtered followings found, skipping DB save.`);
  }
    
    // Calculate actual coin cost for the extraction
    const extractedCount = allFollowings.length;
    const extractionCost = Math.ceil(extractedCount / COIN_RULES.followings.perChunk.users) * COIN_RULES.followings.perChunk.coins;
    const filteringCost = extractedCount * COIN_RULES.followings.perUser;
    const actualCoinCost = extractionCost + filteringCost;
    
    console.log(`[Following Extraction] Actual coin cost calculation: extracted=${extractedCount}, extraction=${extractionCost}, filtering=${filteringCost}, total=${actualCoinCost}`);
    
    return { filteredFollowings: filteredFollowings as ExtractedUser[], actualCoinCost };
  } catch (error: unknown) {
    console.error('[hikerApi] userFollowingChunkGql actual error:', error);
    handleHikerError(error);
    // Return empty result in case of error
    return { filteredFollowings: [], actualCoinCost: 0 };
  }
}


/***********************************************************/
/**                LIKERS API CALL METHOD              **/
/***********************************************************/

// Bulk likers extraction for multiple post URLs
export async function mediaLikersBulkV1(
  payload: { urls: string[], filters: FilterOptions, user_id?: string, skipCoinCheck?: boolean },
  onProgress?: (count: number) => void,
  onTotalEstimated?: (total: number) => void,
  extraction_id?: number | null,
  supabaseClient?: SupabaseClient
) {
  // Coin deduction logic
  const supabaseToUse = supabaseClient || supabase;
  if (!supabaseToUse) throw new Error("Supabase client not initialized");
  const userIdStr: string = payload.user_id || (typeof window !== "undefined" ? localStorage.getItem("user_id") ?? "" : "");
  const skipCoinCheck = !!payload.skipCoinCheck;
  let coins: number = skipCoinCheck ? Infinity : await getUserCoins(userIdStr, supabaseToUse);
  let stopExtraction: boolean = false;
  const { urls, filters } = payload;
  // Support both array and single string with newlines
  const urlList: string[] = Array.isArray(urls)
    ? urls.flatMap(u => String(u).split(/\r?\n/))
    : String(urls).split(/\r?\n/);
  const cleanUrls = urlList.map(u => u.trim()).filter(Boolean);
  
  const allLikers: UserLike[] = [];
  const errorMessages: string[] = [];
  let totalEstimated = 0;
  let urlsProcessed = 0;
  
  for (const url of cleanUrls) {
    try {
      const mediaObj = await mediaByUrlV1(url);
      if (!mediaObj || !mediaObj.id) {
        errorMessages.push(`Could not get media ID for URL: ${url}`);
        continue;
      }
      
      // Calculate total estimation from the first URL's like_count and call onTotalEstimated
      if (urlsProcessed === 0 && onTotalEstimated && mediaObj.like_count) {
        // For multiple URLs, we'll estimate based on the first URL's like count
        // This is approximate but avoids extra API calls
        totalEstimated = mediaObj.like_count * cleanUrls.length;
        console.log(`[hikerApi] Total likes estimated: ${totalEstimated} (${mediaObj.like_count} × ${cleanUrls.length} URLs)`);
        onTotalEstimated(totalEstimated);
      }
      urlsProcessed++;
      const params: Record<string, unknown> = { id: mediaObj.id };
      const res = await getHikerClient().get("/v1/media/likers", { params });
      let newLikers = [];
      if (Array.isArray(res.data)) {
        newLikers = res.data;
      } else if (Array.isArray(res.data?.users)) {
        newLikers = res.data.users;
      } else {
        errorMessages.push(`No likers found for media ID: ${mediaObj.id}`);
      }
      // First deduction: Batch deduction for likers API (like followers pattern)
      let usersExtracted = 0;
      let usersProcessedInBatch = 0;
      // Get coin limit from filters (integer, no decimals)
      const coinLimit = filters?.coinLimit ? Math.floor(filters.coinLimit) : undefined;
      // Calculate max users allowed within coin limit (considering both API calls and userByUsername calls)
      const maxUsersWithinCoinLimit = coinLimit !== undefined 
        ? Math.floor(coinLimit * COIN_RULES.likers.perChunk.users / (COIN_RULES.likers.perChunk.coins + (COIN_RULES.likers.perChunk.users * COIN_RULES.likers.perUser)))
        : undefined;
      
      if (newLikers.length > 0) {
        for (const liker of newLikers) {
          // If coin limit is set, stop when usersExtracted reaches maxUsersWithinCoinLimit
          if (maxUsersWithinCoinLimit !== undefined && usersExtracted >= maxUsersWithinCoinLimit) {
            stopExtraction = true;
            break;
          }
          
          // Check if we have enough coins for the full batch
          if (!skipCoinCheck && usersProcessedInBatch === 0 && coins < COIN_RULES.likers.perChunk.coins) {
            stopExtraction = true;
            break;
          }
          
          allLikers.push(liker);
          usersExtracted++;
          usersProcessedInBatch++;
          if (onProgress) onProgress(allLikers.length);
          
          // Deduct coins when we complete a full batch (every 10 users)
          if (usersProcessedInBatch >= COIN_RULES.likers.perChunk.users) {
            if (!skipCoinCheck) {
              console.log(`[mediaLikersBulkV1] Deducting ${COIN_RULES.likers.perChunk.coins} coins for batch of ${COIN_RULES.likers.perChunk.users} users`);
              coins = await deductCoins(userIdStr, COIN_RULES.likers.perChunk.coins, supabaseToUse);
            }
            usersProcessedInBatch = 0; // Reset batch counter
          }
        }
        
        // Deduct coins for any remaining partial batch
        if (usersProcessedInBatch > 0 && !stopExtraction) {
          if (!skipCoinCheck) {
            console.log(`[mediaLikersBulkV1] Deducting ${COIN_RULES.likers.perChunk.coins} coins for partial batch of ${usersProcessedInBatch} users`);
            coins = await deductCoins(userIdStr, COIN_RULES.likers.perChunk.coins, supabaseToUse);
          }
        }
      }
      if (stopExtraction) break;
    } catch (err) {
      errorMessages.push(`Error processing URL: ${url} - ${String(err)}`);
    }
    if (stopExtraction) break;
  }
  console.log('[mediaLikersBulkV1] All likers collected:', allLikers.length, allLikers);

  // 1. Pre-filter by filterByName before fetching details
  let preFilteredLikers = allLikers;
  if (filters.filterByName) {
    const rawExcludeList = String(filters.filterByName);
    const excludeUsernames = rawExcludeList
      .split(/\r?\n/)
      .map(u => u.trim().toLowerCase())
      .filter(Boolean);
    preFilteredLikers = allLikers.filter(liker => {
      const usernameNormalized = String(liker.username).toLowerCase();
      return !excludeUsernames.includes(usernameNormalized);
    });
  }
  console.log('[mediaLikersBulkV1] Likers after pre-filtering:', preFilteredLikers.length, preFilteredLikers);

  // Second deduction: For userByUsername calls (like followers pattern)
  if (!skipCoinCheck) {
    const perUserTotalCost = preFilteredLikers.length * COIN_RULES.likers.perUser;
    console.log(`[mediaLikersBulkV1] Second deduction for userByUsername calls: ${preFilteredLikers.length} users × ${COIN_RULES.likers.perUser} = ${perUserTotalCost} coins`);
    console.log(`[mediaLikersBulkV1] Current coins: ${coins}, Required: ${perUserTotalCost}`);
    if (coins < perUserTotalCost) {
      console.warn(`[mediaLikersBulkV1] Insufficient coins for userByUsername calls. Required: ${perUserTotalCost}, Available: ${coins}`);
      stopExtraction = true;
    } else {
      coins = await deductCoins(userIdStr, perUserTotalCost, supabaseToUse);
      console.log(`[mediaLikersBulkV1] Coins deducted successfully for userByUsername calls. New balance: ${coins}`);
      stopExtraction = false; // Ensure we always run the loop after successful deduction
    }
  }
  // 2. Fetch details for each remaining user
  const detailedLikers: UserDetails[] = [];
  console.log('[mediaLikersBulkV1][DEBUG] stopExtraction:', stopExtraction);
  if (!stopExtraction) {
    console.log('[mediaLikersBulkV1][DEBUG] Entering userByUsernameV1 loop with', preFilteredLikers.length, 'users');
    for (const liker of preFilteredLikers) {
      try {
        console.log('[mediaLikersBulkV1][DEBUG] Calling userByUsernameV1 with:', liker.username, liker);
        const details = await userByUsernameV1(liker.username);
        console.log('[mediaLikersBulkV1][DEBUG] userByUsernameV1 result for', liker.username, ':', details);
        if (details) {
          detailedLikers.push(details);
        } else {
          console.warn('[mediaLikersBulkV1][DEBUG] No details returned for', liker.username);
        }
      } catch (err) {
        // If error is 403 or 404, skip and continue
        if (typeof err === 'object' && err !== null && 'response' in err) {
          const response = (err as { response?: { status?: number } }).response;
          if (response && (response.status === 404 || response.status === 403)) {
            // Ignore and continue
            continue;
          }
        }
        console.error('[mediaLikersBulkV1][DEBUG] Error fetching details for', liker.username, ':', err);
        errorMessages.push(`Error fetching details for username: ${liker.username} - ${String(err)}`);
      }
    }
    console.log('[mediaLikersBulkV1][DEBUG] Finished userByUsernameV1 loop');
  } else {
    console.warn('[mediaLikersBulkV1][DEBUG] Skipping userByUsernameV1 loop due to stopExtraction');
  }
  console.log('[mediaLikersBulkV1] Detailed likers fetched:', detailedLikers.length, detailedLikers);

  // 3. Call extractFilteredUsers with detailed users
  const filteredLikers = await extractFilteredUsers(
    detailedLikers as unknown as UserLike[],
    filters,
    async (username: string): Promise<UserDetails> => detailedLikers.find(u => u.username === username) as UserDetails
  );
  console.log('[mediaLikersBulkV1] Likers after filtering:', filteredLikers.length, filteredLikers);

  // Save filtered likers to database with extraction_id if provided
  if (!skipCoinCheck && filteredLikers.length > 0 && supabaseToUse) {
    try {
      let extractionIdToUse = extraction_id;
      if (!extractionIdToUse) {
        // Create extraction record if not provided (frontend direct call)
        const extractionType = "likers";
        const targetUsernames = cleanUrls.join(",");
        const requestedAt = new Date().toISOString();
        const completedAt = new Date().toISOString();
        const pageCount = cleanUrls.length;
        const extractionInsert = {
          user_id: userIdStr,
          extraction_type: extractionType,
          target_usernames: targetUsernames,
          target_user_id: null,
          requested_at: requestedAt,
          completed_at: completedAt,
          status: "completed",
          page_count: pageCount,
          next_page_id: null,
          error_message: null,
        };
        const { data: extraction, error: extractionError } = await supabaseToUse
          .from("extractions")
          .insert([extractionInsert])
          .select()
          .single();
        if (extractionError) {
          errorMessages.push("Error saving extraction record: " + String(extractionError.message));
        } else if (extraction && extraction.id) {
          extractionIdToUse = extraction.id;
          console.log('[mediaLikersBulkV1] Extraction record created with ID:', extraction.id);
        }
      }
      if (extractionIdToUse) {
        for (const liker of filteredLikers) {
          liker.extraction_id = String(extractionIdToUse);
        }
        const { error: usersError } = await supabaseToUse
          .from("extracted_users")
          .insert(filteredLikers);
        if (usersError) {
          errorMessages.push("Error saving filtered likers to database: " + String(usersError.message));
        } else {
          console.log('[mediaLikersBulkV1] Likers saved to DB:', filteredLikers.length);
        }
      }
    } catch (err) {
      errorMessages.push("Exception during DB save: " + String(err));
    }
  }

  return { filteredLikers, errorMessages };
}


// // Get media likers
// export async function mediaLikersV1(url: string) {
//   try {
//     const mediaObj = await mediaByUrlV1(url);
//     const params: Record<string, unknown> = { id: mediaObj.id };
//     const res = await getHikerClient().get("/v1/media/likers", { params });
//     return res.data;
//   } catch (error: unknown) {
//     handleHikerError(error);
//   }
// }


// Get media object by post URL (returns pk/id)


/******************************************************/
/**           USERS EXTRACTION FROM COMMENTS         **/
/******************************************************/

// Bulk commenters extraction for multiple post URLs
export async function extractCommentersBulkV2(
  payload: { urls: string[], filters: FilterOptions, user_id?: string },
  onProgress?: (count: number) => void,
  onTotalEstimated?: (total: number) => void,
  supabaseClient?: SupabaseClient
) {
  // Coin deduction logic
  const userId = payload.user_id || (typeof window !== "undefined" ? localStorage.getItem("user_id") : null);
  const userIdStr: string = userId ?? "";
  const supabaseToUse = supabaseClient || supabase;
  if (!supabaseToUse) throw new Error("Supabase client not initialized");
  let coins: number = await getUserCoins(userIdStr, supabaseToUse);
  let commentersSinceLastDeduction = 0;
  
  // Get coin limit from filters and track total coins deducted
  const coinLimit = payload.filters?.coinLimit ? Math.floor(payload.filters.coinLimit) : undefined;
  let totalCoinsDeducted = 0;

  const cleanUrls = Array.isArray(payload.urls)
    ? payload.urls.flatMap((u: string) => String(u).split(/\r?\n/))
    : String(payload.urls).split(/\r?\n/);
  const cleanUrlsTrimmed = cleanUrls.map(u => u.trim()).filter(Boolean);
  console.log('[extractCommentersBulkV2] URLs received:', cleanUrlsTrimmed);
  
  const allComments = [];
  const errorMessages: string[] = [];
  let stopExtraction = false;
  let totalEstimated = 0;
  let urlsProcessed = 0;
  
  for (const url of cleanUrlsTrimmed) {
    if (stopExtraction) break;
    try {
      console.log(`[extractCommentersBulkV2] Processing URL:`, url);
      const mediaObj = await mediaByUrlV1(url);
      console.log(`[extractCommentersBulkV2] mediaByUrlV1 result:`, mediaObj);
      if (!mediaObj || !mediaObj.id) {
        errorMessages.push(`Could not get media ID for URL: ${url}`);
        continue;
      }
      
      // Calculate total estimation from the first URL's comment_count and call onTotalEstimated
      if (urlsProcessed === 0 && onTotalEstimated && mediaObj.comment_count) {
        // For multiple URLs, we'll estimate based on the first URL's comment count
        // This is approximate but avoids extra API calls
        totalEstimated = mediaObj.comment_count * cleanUrlsTrimmed.length;
        console.log(`[hikerApi] Total comments estimated: ${totalEstimated} (${mediaObj.comment_count} × ${cleanUrlsTrimmed.length} URLs)`);
        onTotalEstimated(totalEstimated);
      }
      urlsProcessed++;
      let nextPageId: string | undefined = undefined;
      let pageCount = 0;
      do {
        console.log(`[extractCommentersBulkV2] Fetching comments for media_id:`, mediaObj.id, 'page_id:', nextPageId);
        const res = await mediaCommentsV2(mediaObj.id, undefined, nextPageId);
        const data = res;
        const comments = data && data.response && Array.isArray(data.response.comments)
          ? data.response.comments
          : [];
        console.log(`[extractCommentersBulkV2] Comments fetched:`, comments.length);
        for (const comment of comments) {
          // Filtering logic for comments
          const commentText = String(comment.text || '').toLowerCase();
          // 1. Exclude if contains any word in 'excludeWords'
          let exclude = false;
          if (payload.filters.commentExcludeWords) {
            const excludeWords = String(payload.filters.commentExcludeWords)
              .split(/\r?\n/)
              .map(w => w.trim().toLowerCase())
              .filter(Boolean);
            if (excludeWords.some(word => commentText.includes(word))) {
              exclude = true;
            }
          }
          if (exclude) continue;
          // 2. Stop extraction if contains any stop word
          if (payload.filters.commentStopWords) {
            const stopWords = String(payload.filters.commentStopWords)
              .split(/\r?\n/)
              .map(w => w.trim().toLowerCase())
              .filter(Boolean);
            if (stopWords.some(word => commentText.includes(word))) {
              stopExtraction = true;
              console.log(`[extractCommentersBulkV2] STOP triggered: Comment contains stop word. Extraction will stop and save collected comments.`);
              break;
            }
          }
          // Coin deduction logic: 1 coin per 2 commenters
          commentersSinceLastDeduction++;
          if (commentersSinceLastDeduction >= COIN_RULES.commenters.perChunk.users) {
            // Check coin limit before deducting
            if (coinLimit !== undefined && totalCoinsDeducted + COIN_RULES.commenters.perChunk.coins >= coinLimit) {
              stopExtraction = true;
              break;
            }
            if (coins < COIN_RULES.commenters.perChunk.coins) {
              stopExtraction = true;
              break;
            }
            const prevCommentersCoins = coins;
            coins = await deductCoins(userIdStr, COIN_RULES.commenters.perChunk.coins, supabaseToUse);
            totalCoinsDeducted += COIN_RULES.commenters.perChunk.coins;
            console.log(`[hikerApi] [CommentersV2] Deducted ${COIN_RULES.commenters.perChunk.coins} coins from user ${userIdStr}. Previous balance: ${prevCommentersCoins}, New balance: ${coins}. Total deducted: ${totalCoinsDeducted}`);
            commentersSinceLastDeduction = 0;
            stopExtraction = false; // Ensure extraction continues after successful deduction
          }
          if (stopExtraction) break;
          // Prepare data for DB
          allComments.push({
            comment_id: comment.pk,
            media_id: comment.media_id,
            user_id: comment.user_id,
            username: comment.user?.username || '',
            full_name: comment.user?.full_name || '',
            profile_pic_url: comment.user?.profile_pic_url || '',
            is_private: comment.user?.is_private ?? null,
            is_verified: comment.user?.is_verified ?? null,
            is_mentionable: comment.user?.is_mentionable ?? null,
            comment_text: comment.text,
            like_count: comment.like_count ?? comment.comment_like_count ?? 0,
            created_at: comment.created_at ? new Date(comment.created_at * 1000).toISOString() : null,
            parent_comment_id: comment.parent_comment_id ?? null,
          });
          if (onProgress) onProgress(allComments.length);
        }
        if (stopExtraction) break;
        nextPageId = typeof data.next_page_id === 'string' && data.next_page_id ? data.next_page_id : undefined;
        pageCount++;
      } while (nextPageId && !stopExtraction);
      console.log(`[extractCommentersBulkV2] Finished fetching for URL:`, url, 'Total pages:', pageCount);
    } catch (err) {
      errorMessages.push(`Error processing URL: ${url} - ${String(err)}`);
      console.error(`[extractCommentersBulkV2] Error processing URL:`, url, err);
    }
  }
  console.log('[extractCommentersBulkV2] Total comments after filtering:', allComments.length);
  // Save comments to database with extraction record
  if (allComments.length > 0) {
    try {
      const userIdForDb = payload.user_id || (typeof window !== "undefined" ? localStorage.getItem("user_id") : null);
      const extractionType = "commenters";
      const targetUsernames = cleanUrlsTrimmed.join(",");
      const requestedAt = new Date().toISOString();
      const completedAt = new Date().toISOString();
      const pageCount = cleanUrlsTrimmed.length;
      const extractionInsert = {
        user_id: userIdForDb,
        extraction_type: extractionType,
        target_usernames: targetUsernames,
        target_user_id: null,
        requested_at: requestedAt,
        completed_at: completedAt,
        status: "completed",
        page_count: pageCount,
        next_page_id: null,
        error_message: null,
      };
      console.log('[extractCommentersBulkV2] Saving extraction record:', extractionInsert);
  if (!supabaseToUse) throw new Error("Supabase client not initialized");
  const { data: extraction, error: extractionError } = await supabaseToUse
        .from("extractions")
        .insert([extractionInsert])
        .select()
        .single();
      if (extractionError) {
        errorMessages.push("Error saving extraction record: " + String(extractionError.message));
        console.error('[extractCommentersBulkV2] Error saving extraction record:', extractionError);
      } else if (extraction && extraction.id) {
        for (const comment of allComments) {
          (comment as ExtractedCommenter).extraction_id = extraction.id;
        }
        console.log('[extractCommentersBulkV2] Extraction record created with ID:', extraction.id);
  if (!supabaseToUse) throw new Error("Supabase client not initialized");
  const { error: commentsError } = await supabaseToUse
          .from("extracted_commenters")
          .insert(allComments);
        if (commentsError) {
          errorMessages.push("Error saving filtered comments to database: " + String(commentsError.message));
          console.error('[extractCommentersBulkV2] Error saving filtered comments to database:', commentsError);
        } else {
          console.log('[extractCommentersBulkV2] Filtered comments saved to DB:', allComments.length);
        }
      }
    } catch (err) {
      errorMessages.push("Exception during DB save: " + String(err));
      console.error('[extractCommentersBulkV2] Exception during DB save:', err);
    }
  } else {
    console.warn('[extractCommentersBulkV2] No comments found, skipping DB save.');
  }
  console.log('[extractCommentersBulkV2] Returning comments. Count:', allComments.length);
  return { comments: allComments, errorMessages };
}



// Get media comments (commenters)
export async function mediaCommentsV2(id: string, can_support_threading?: boolean, page_id?: string) {
  try {
    const params: Record<string, unknown> = { id };
    if (can_support_threading !== undefined) params.can_support_threading = can_support_threading;
    if (page_id !== undefined) params.page_id = page_id;
    const res = await getHikerClient().get("/v2/media/comments", { params });
    console.log('[mediaCommentsV2] Hiker API response:', JSON.stringify(res.data, null, 2));
    return res.data;
  } catch (error: unknown) {
    handleHikerError(error);
  }
}

// Single-page comments fetch for batching (no internal loops)
export async function getCommentsPage(
  mediaId: string,
  page_id?: string
): Promise<{ items: any[]; next_page_id?: string }> {
  const data = await mediaCommentsV2(mediaId, undefined, page_id);
  const comments = data && data.response && Array.isArray(data.response.comments)
    ? data.response.comments
    : [];
  const nextPageId = typeof data?.next_page_id === 'string' && data.next_page_id
    ? data.next_page_id
    : (typeof data?.response?.next_page_id === 'string' && data.response.next_page_id ? data.response.next_page_id : undefined);
  return { items: comments, next_page_id: nextPageId };
}

// Single-page user medias fetch for batching (no internal loops)
export async function getUserMediasPage(
  userPk: string,
  page_id?: string
): Promise<{ items: any[]; next_page_id?: string }> {
  const params: Record<string, unknown> = { user_id: userPk };
  if (page_id) params.page_id = page_id;
  const res = await getHikerClient().get("/v2/user/medias", { params });
  const data = res.data ?? {};
  const items = Array.isArray(data?.response?.items) ? data.response.items : [];
  const nextPageId = typeof data?.next_page_id === 'string' && data.next_page_id
    ? data.next_page_id
    : (typeof data?.response?.next_page_id === 'string' && data.response.next_page_id ? data.response.next_page_id : undefined);
  return { items, next_page_id: nextPageId };
}



/************************************************/
/**        POSTS EXTRACTION FROM USERS         **/
/************************************************/


// ExtractedPost type for posts extraction
export interface ExtractedPost {
  post_id: string;
  code: string;
  caption_text?: string;
  media_type: number;
  product_type?: string;
  taken_at?: string;
  like_count?: number;
  comment_count?: number;
  thumbnail_url?: string;
  user_id: string;
  username: string;
  extraction_id?: number;
}

export async function getUserPosts(
  payload: { target: string | string[], filters?: FilterOptions, user_id?: string },
  onProgress?: (count: number) => void,
  onTotalEstimated?: (total: number) => void,
  supabaseClient?: SupabaseClient
) {
  // Accept user_id and supabase from payload or arguments (for worker compatibility)
  const userId = payload.user_id || (typeof window !== "undefined" ? localStorage.getItem("user_id") : null);
  const userIdStr: string = userId ?? "";
  const supabaseToUse = supabaseClient || supabase;
  if (!supabaseToUse) throw new Error("Supabase client not initialized");
  let coins: number = await getUserCoins(userIdStr, supabaseToUse);

  // Get coin limit from filters and track total coins deducted
  const coinLimit = payload.filters?.coinLimit ? Math.floor(payload.filters.coinLimit) : undefined;
  let totalCoinsDeducted = 0;

  console.log('[getUserPosts] FULL PAYLOAD:', JSON.stringify(payload, null, 2));
  const { target, filters } = payload;
  console.log('[getUserPosts] Called with target:', target, 'filters:', filters);
  if (!filters || typeof filters !== 'object') {
    console.warn('[getUserPosts] WARNING: filters is missing or not an object. Filtering will be skipped.');
  } else {
    console.log('[getUserPosts] Filters keys:', Object.keys(filters));
  }
  const usernames = Array.isArray(target) ? target : [target];

  const extractedPosts: ExtractedPost[] = [];
  let totalEstimated = 0;
  let usersProcessed = 0;
  
  for (const uname of usernames) {
    if (onProgress) onProgress(extractedPosts.length);
    const cleanUsername = uname.replace(/^@/, "");
    console.log(`[getUserPosts] Processing username:`, cleanUsername);
    const user = await userByUsernameV1(cleanUsername);
    console.log(`[getUserPosts] userByUsernameV1 result for ", cleanUsername, ":`, user);
    if (!user || !user.pk) {
      console.error(`[getUserPosts] User not found for username:`, cleanUsername);
      continue;
    }
    
    // Calculate total estimation from the first user's media_count and call onTotalEstimated
    if (usersProcessed === 0 && onTotalEstimated && user.media_count) {
      // For multiple users, we'll estimate based on the first user's media count
      // This is approximate but avoids extra API calls
      totalEstimated = user.media_count * usernames.length;
      console.log(`[hikerApi] Total posts estimated: ${totalEstimated} (${user.media_count} × ${usernames.length} users)`);
      onTotalEstimated(totalEstimated);
    }
    usersProcessed++;
    const user_id = user.pk;
    let nextPageId: string | undefined = undefined;
    let pageCount = 0;
    let stopExtraction = false;
    do {
      const params: Record<string, unknown> = { user_id };
      if (nextPageId) params.page_id = nextPageId;
      console.log(`[getUserPosts] Fetching medias for user_id:`, user_id, 'page_id:', nextPageId);
      let res, data, medias;
      try {
        res = await getHikerClient().get("/v2/user/medias", { params });
        data = res.data;
        medias = data && data.response && Array.isArray(data.response.items) ? data.response.items : [];
        console.log(`[getUserPosts] Medias fetched for user_id:`, user_id, 'Count:', medias.length);
      } catch (err) {
        if (typeof err === 'object' && err !== null && 'response' in err) {
          const response = (err as { response?: { status?: number } }).response;
          if (response && (response.status === 404 || response.status === 403)) {
            console.warn(`[getUserPosts] Skipping user_id ${user_id} due to error status:`, response.status);
            break; // Skip this user, continue with next username
          }
        }
        
        throw err;
      }
      console.log(medias)
      for (const media of medias) {
        // Check coin limit before deducting
        if (coinLimit !== undefined && totalCoinsDeducted + COIN_RULES.posts.perPost >= coinLimit) {
          stopExtraction = true;
          break;
        }
        // Deduct coins: 2 coins per post
        if (coins < COIN_RULES.posts.perPost) {
          stopExtraction = true;
          break;
        }
        const prevPostsCoins = coins;
  coins = await deductCoins(userIdStr, COIN_RULES.posts.perPost, supabaseToUse);
        totalCoinsDeducted += COIN_RULES.posts.perPost;
        console.log(`[hikerApi] [PostsV2] Deducted ${COIN_RULES.posts.perPost} coins from user ${userIdStr}. Previous balance: ${prevPostsCoins}, New balance: ${coins}. Total deducted: ${totalCoinsDeducted}`);
        stopExtraction = false; // Ensure extraction continues after successful deduction
        // Filtering logic
        let includePost = true;
  const filterReasons: string[] = [];
        // Likes range
        const likesMin = typeof filters?.likesMin === 'string' ? Number(filters.likesMin) : filters?.likesMin;
        const likesMax = typeof filters?.likesMax === 'string' ? Number(filters.likesMax) : filters?.likesMax;
        console.log(`[getUserPosts][Filter][DEBUG] typeof media.like_count:`, typeof media.like_count, 'media.like_count:', media.like_count, 'likesMin:', likesMin, 'likesMax:', likesMax);
        if (typeof likesMin === 'number' && typeof media.like_count === 'number') {
          if (media.like_count < likesMin) {
            includePost = false;
            filterReasons.push(`like_count < likesMin (${media.like_count} < ${likesMin})`);
          }
  // ...existing code continues...
        if (typeof likesMax === 'number' && typeof media.like_count === 'number') {
          if (media.like_count > likesMax) {
            includePost = false;
            filterReasons.push(`like_count > likesMax (${media.like_count} > ${likesMax})`);
          }
        }
        // Comments range
        const commentsMin = typeof filters?.commentsMin === 'string' ? Number(filters.commentsMin) : filters?.commentsMin;
        const commentsMax = typeof filters?.commentsMax === 'string' ? Number(filters.commentsMax) : filters?.commentsMax;
        console.log(`[getUserPosts][Filter][DEBUG] typeof media.comment_count:`, typeof media.comment_count, 'media.comment_count:', media.comment_count, 'commentsMin:', commentsMin, 'commentsMax:', commentsMax);
        if (typeof commentsMin === 'number' && typeof media.comment_count === 'number') {
          if (media.comment_count < commentsMin) {
            includePost = false;
            filterReasons.push(`comment_count < commentsMin (${media.comment_count} < ${commentsMin})`);
          }
        }
        if (typeof commentsMax === 'number' && typeof media.comment_count === 'number') {
          if (media.comment_count > commentsMax) {
            includePost = false;
            filterReasons.push(`comment_count > commentsMax (${media.comment_count} > ${commentsMax})`);
          }
        }
        }
        // Caption contains words (exclude posts)
        if (typeof filters?.captionContains === 'string' && media.caption && typeof media.caption.text === 'string') {
          const containsWords = String(filters.captionContains).split(/\r?\n/).map(w => w.trim()).filter(Boolean);
          const captionLower = media.caption.text.toLowerCase();
          console.log(`[getUserPosts][Filter] Comparing captionContains: captionLower='${captionLower}', containsWords=`, containsWords);
          if (containsWords.length > 0) {
            const found = containsWords.some(word => captionLower.includes(word.toLowerCase()));
            if (found) {
              includePost = false;
              filterReasons.push(`caption contains word from captionContains filter`);
            }
          }
        }
        // Caption stop words (stop extraction)
        if (typeof filters?.captionStopWords === 'string' && media.caption && typeof media.caption.text === 'string') {
          const stopWords = String(filters.captionStopWords).split(/\r?\n/).map(w => w.trim()).filter(Boolean);
          const captionLower = media.caption.text.toLowerCase();
          if (stopWords.length > 0) {
            const foundStop = stopWords.some(word => captionLower.includes(word.toLowerCase()));
            if (foundStop) {
              stopExtraction = true;
              filterReasons.push(`STOP triggered: caption contains stop word`);
              console.log(`[getUserPosts] STOP triggered: Post ${media.id} caption contains stop word. Extraction will stop and save collected posts.`);
              break;
            }
          }
        }
        if (includePost) {
          extractedPosts.push({
            post_id: media.id,
            code: media.code,
            caption_text: media.caption && typeof media.caption.text === 'string' ? media.caption.text : undefined,
            media_type: media.media_type,
            product_type: media.product_type,
            taken_at: media.taken_at ? new Date(media.taken_at * 1000).toISOString() : undefined,
            like_count: media.like_count,
            comment_count: media.comment_count,
            thumbnail_url: media.thumbnail_url || (media.image_versions2?.candidates?.[0]?.url),
            user_id,
            username: cleanUsername,
          });
          if (onProgress) onProgress(extractedPosts.length);
          console.log(`[getUserPosts] Post added:`, media.id, 'Likes:', media.like_count, 'Comments:', media.comment_count);
        } else {
          console.log(`[getUserPosts] Post ${media.id} excluded for reasons:`, filterReasons.join(", "));
        }
        if (stopExtraction) break;
      }
      pageCount++;
      if (stopExtraction) {
        console.log(`[getUserPosts] Extraction stopped due to stop word. Breaking out of pagination loop.`);
        break;
      }
      nextPageId = typeof data.next_page_id === 'string' && data.next_page_id ? data.next_page_id : undefined;
      console.log(`[getUserPosts] Next page id:`, nextPageId);
    } while (nextPageId);
    console.log(`[getUserPosts] Finished fetching for username:`, cleanUsername, 'Total pages:', pageCount);
    if (stopExtraction) {
      console.log(`[getUserPosts] Extraction stopped for username:`, cleanUsername);
      break;
    }
  }

  console.log(`[getUserPosts] Total posts extracted:`, extractedPosts.length);
  // Save posts to DB (Supabase) and link to extraction
  console.log(`[getUserPosts] Attempting to save ${extractedPosts.length} posts to DB.`);
  if (extractedPosts.length > 0) {
    try {
      // Use userId from payload or fallback to localStorage (frontend)
      const userId = payload.user_id || (typeof window !== "undefined" ? localStorage.getItem("user_id") : null);
      const extractionType = "posts";
      const targetUsernames = usernames.join(",");
      const requestedAt = new Date().toISOString();
      const completedAt = new Date().toISOString();
      const pageCount = extractedPosts.length; // or use actual page count if needed
      // Create extraction record
      const extractionInsert = {
        user_id: userId,
        extraction_type: extractionType,
        target_usernames: targetUsernames,
        target_user_id: null,
        requested_at: requestedAt,
        completed_at: completedAt,
        status: "completed",
        page_count: pageCount,
        next_page_id: null,
        error_message: null,
      };
      console.log('[getUserPosts] Inserting extraction record:', extractionInsert);
  if (!supabaseToUse) throw new Error("Supabase client not initialized");
  const { data: extraction, error: extractionError } = await supabaseToUse
        .from("extractions")
        .insert([extractionInsert])
        .select()
        .single();
      if (extractionError) {
        console.error("[getUserPosts] Error saving extraction record:", extractionError);
      } else if (extraction && extraction.id) {
        // Attach extraction_id to each post
        for (const post of extractedPosts) {
          post.extraction_id = extraction.id;
        }
        console.log('[getUserPosts] Extraction record created with ID:', extraction.id);
        console.log('[getUserPosts] Saving extracted posts:', extractedPosts);
        // Save posts to extracted_posts
  if (!supabaseToUse) throw new Error("Supabase client not initialized");
  const { error: postsError } = await supabaseToUse
          .from("extracted_posts")
          .insert(extractedPosts);
        if (postsError) {
          console.error("[getUserPosts] Error saving extracted posts:", postsError);
        } else {
          console.log(`[getUserPosts] Posts saved to DB successfully.`);
        }
      }
    } catch (err) {
      console.error("[getUserPosts] Exception saving posts:", err);
    }
  } else {
    console.warn(`[getUserPosts] No posts extracted, skipping DB save.`);
  }
  console.log(`[getUserPosts] Returning extractedPosts. Count:`, extractedPosts.length);
  return { extractedPosts };
}







function handleHikerError(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const err = error as { response?: { status?: number; data?: { message?: string } }; message?: string };
    if (err.response?.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    throw new Error(err.response?.data?.message || "Hiker API error");
  }
  throw new Error((error as { message?: string }).message || "Unknown Hiker API error");
}



 /***************************************************/
 /**          HASHTAG EXTRACTION METHOD           **/
/**************************************************/



/**
 * Extract all hashtag clips for multiple hashtags, paginating until no next_page_id.
 * @param payload { hashtags: string[], filters?: Record<string, unknown>, extraction_id?: number, user_id?: string }
 */
export async function extractHashtagClipsBulkV2(
  payload: { hashtags: string[], filters?: Record<string, unknown>, extraction_id?: number, user_id?: string },
  onProgress?: (count: number) => void,
  onTotalEstimated?: (total: number) => void,
  supabaseClient?: SupabaseClient | null
) {
  const { hashtags, filters } = payload;
  // Extract hashtagLimit from filters, ensure it's a number
  // hashtagLimit is extracted and used later in the function, so no need to assign it here if not used immediately
  // hashtagLimit is extracted and used later in the function, so no need to assign it here if not used immediately
 
  // 1. Create extraction record
  const hashtagLimit = filters && typeof filters.hashtagLimit === 'number' ? filters.hashtagLimit : (filters && typeof filters.hashtagLimit === 'string' ? Number(filters.hashtagLimit) : undefined);

  // Calculate total estimated posts based on hashtag limit
  // Defensive: ensure hashtags is always an array
  let hashtagsArr: string[] = [];
  const hashtagsInput: string[] | string | undefined = hashtags as string[] | string | undefined;
  if (Array.isArray(hashtagsInput)) {
    hashtagsArr = hashtagsInput.filter((h): h is string => typeof h === 'string');
  } else if (typeof hashtagsInput === 'string' && hashtagsInput.length > 0) {
    hashtagsArr = hashtagsInput.split(',').map((h: string) => h.trim()).filter(Boolean);
  }
  if (onTotalEstimated && hashtagLimit && hashtagsArr.length) {
    const totalEstimated = hashtagLimit * hashtagsArr.length; // hashtag limit per hashtag * number of hashtags
    console.log(`[hikerApi] Total hashtag posts estimated: ${totalEstimated} (${hashtagLimit} per hashtag × ${hashtagsArr.length} hashtags)`);
    onTotalEstimated(totalEstimated);
  }

  if (!hashtagsArr.length) {
    console.error('[extractHashtagClipsBulkV2] No hashtags provided for extraction. Skipping extraction.');
    return { error: 'No hashtags provided', results: [] };
  }

  console.log('[extractHashtagClipsBulkV2] Starting hashtag extraction for:', hashtagsArr);
  const userId = payload.user_id || (typeof window !== "undefined" ? localStorage.getItem("user_id") : null);
  const userIdStr: string = userId ?? "";
  const supabaseToUse = supabaseClient || supabase;
  if (!supabaseToUse) throw new Error("Supabase client not initialized");
  let coins: number = await getUserCoins(userIdStr, supabaseToUse);
  const extractionType = "hashtags";
  const targetUsernames = hashtagsArr.join(",");
  const requestedAt = new Date().toISOString();
  const extractionInsert = {
    user_id: userId,
    extraction_type: extractionType,
    target_usernames: targetUsernames,
    target_user_id: null,
    requested_at: requestedAt,
    status: "completed",
    page_count: hashtags.length,
    next_page_id: null,
    error_message: null,
  };
  console.log('[extractHashtagClipsBulkV2] Inserting extraction record:', extractionInsert);
  if (!supabaseToUse) throw new Error("Supabase client not initialized");
  const { data: extraction, error: extractionError } = await supabaseToUse
    .from("extractions")
    .insert([extractionInsert])
    .select()
    .single();
  if (extractionError || !extraction) {
    console.error('[extractHashtagClipsBulkV2] Failed to create extraction record:', extractionError);
    throw new Error("Failed to create extraction record");
  }
  const extraction_id = extraction.id;
  console.log('[extractHashtagClipsBulkV2] Extraction record created with ID:', extraction_id);

  // 2. Collect all hashtag posts
  const allResults = [];
  for (const hashtag of hashtags) {
    if (onProgress) onProgress(allResults.length);
    console.log(`[extractHashtagClipsBulkV2] Fetching clips for hashtag: #${hashtag}`);
    let nextPageId = null;
    let hashtagClipCount = 0;
    let stopExtraction = false;
    // do {
    
      const params: Record<string, unknown> = { name: hashtag };
      if (nextPageId) params.page_id = nextPageId;
      // Only pass API-relevant filters; strip client-only ones like hashtagLimit
      if (filters) {
        const { hashtagLimit, ...apiFilterParams } = filters as Record<string, unknown>;
        Object.assign(params, apiFilterParams);
      }
      try {
        const res = await getHikerClient().get("/v2/hashtag/medias/clips", { params });
        const data = res.data ?? {};
        // Extract clips and media from response.sections
        const sections = data?.response?.sections ?? [];
        const clips: HashtagClip[] = [];
        for (const section of sections) {
          // Extract clips from one_by_two_item
          const oneByTwoClips = section?.layout_content?.one_by_two_item?.clips?.items;
          if (Array.isArray(oneByTwoClips)) {
            for (const clip of oneByTwoClips) {
              clips.push(clip);
            }
          }
          // Extract media from fill_items
          const fillItems = section?.layout_content?.fill_items;
          if (Array.isArray(fillItems)) {
            for (const item of fillItems) {
              if (item?.media) {
                clips.push(item.media);
              }
            }
          }
        }

        console.log(`[extractHashtagClipsBulkV2] Data accessed for #${hashtag}:`, JSON.stringify(data, null, 2));
        console.log(`[extractHashtagClipsBulkV2] Normalized clips array for #${hashtag}:`, clips.length, 'clips:', clips);

        if (clips.length > 0) {
          console.log(`[extractHashtagClipsBulkV2] Clips fetched for #${hashtag}:`, clips.length);
          console.log(`[extractHashtagClipsBulkV2] First clip object for #${hashtag}:`, JSON.stringify(clips[0], null, 2));
          for (const clip of clips) {
            // Enforce hashtag limit BEFORE deducting coins or saving
            console.log(`[extractHashtagClipsBulkV2] Comparing hashtagLimit (${hashtagLimit}) with allResults.length (${allResults.length})`);
            if (hashtagLimit !== undefined && allResults.length >= hashtagLimit) {
              console.log(`[extractHashtagClipsBulkV2] Hashtag limit (${hashtagLimit}) reached. Stopping extraction. allResults.length:`, allResults.length);
              stopExtraction = true;
              break;
            }
            // Deduct 10 coins per post
            if (coins < 10) {
              console.log(`[extractHashtagClipsBulkV2] Not enough coins to continue. Coins:`, coins);
              stopExtraction = true;
              break;
            }
            const prevHashtagCoins = coins;
            coins = await deductCoins(userIdStr, 10, supabaseToUse);
            console.log(`[hikerApi] [HashtagV2] Deducted 10 coins from user ${userIdStr}. Previous balance: ${prevHashtagCoins}, New balance: ${coins}`);
            stopExtraction = false; // Ensure extraction continues after successful deduction
            console.log(`[hikerApi] [HashtagV2] Creating dbRow for clip:`, JSON.stringify(clip, null, 2));
            // If clip has a nested 'media' object, extract fields from there
            const mediaObj = clip.media || clip;
            console.log(`[hikerApi] [HashtagV2] media id:`, mediaObj.id, "||" ,  mediaObj.pk);
            const dbRow = {
              extraction_id,
              post_id: mediaObj.id || mediaObj.pk || null,
              media_url:
                mediaObj.media_url ||
                mediaObj.video_url ||
                mediaObj.image_url ||
                (typeof mediaObj.image_versions2 === 'object' && mediaObj.image_versions2?.candidates?.[0]?.url) ||
                null,
              taken_at: mediaObj.taken_at ? new Date(mediaObj.taken_at * 1000).toISOString() : null,
              like_count: mediaObj.like_count || 0,
              caption:
                typeof mediaObj.caption === 'object' && mediaObj.caption !== null
                  ? mediaObj.caption.text || null
                  : mediaObj.caption || mediaObj.caption_text || null,
              hashtags: Array.isArray(mediaObj.hashtags) ? mediaObj.hashtags.join(",") : (mediaObj.hashtags || null),
              username: mediaObj.username || (mediaObj.user && mediaObj.user.username) || null,
              full_name: (mediaObj.user && mediaObj.user.full_name) || null,
              profile_pic_url: (mediaObj.user && mediaObj.user.profile_pic_url) || null,
              is_verified: (mediaObj.user && mediaObj.user.is_verified) || false,
              is_private: (mediaObj.user && mediaObj.user.is_private) || false,
            };
            if (dbRow.post_id) {
              console.log(`[extractHashtagClipsBulkV2] Saving dbRow to allResults:`, JSON.stringify(dbRow, null, 2));
              allResults.push(dbRow);
            } else {
              console.warn('[extractHashtagClipsBulkV2] Skipping row with missing post_id:', JSON.stringify(dbRow, null, 2));
            }
            if (onProgress) onProgress(allResults.length);
            hashtagClipCount++;
          }
          console.log(`[extractHashtagClipsBulkV2] Total clips collected for #${hashtag} so far:`, hashtagClipCount);
        } else {
          console.log(`[extractHashtagClipsBulkV2] No clips found for #${hashtag} on this page. Response:`, JSON.stringify(res.data, null, 2));
        }
        nextPageId = data?.next_page_id || data?.response?.next_page_id || null;
      } catch (err) {
        console.error(`[extractHashtagClipsBulkV2] Error fetching hashtag clips for #${hashtag}:`, err);
        break;
      }
    
    // } while (nextPageId && !stopExtraction);
    console.log(`[extractHashtagClipsBulkV2] Finished fetching for #${hashtag}. Total clips:`, hashtagClipCount);
    if (stopExtraction) {
      console.log(`[extractHashtagClipsBulkV2] Extraction stopped due to hashtag limit or coins.`);
      break;
    }
  }

  //3. Save all hashtag posts in bulk
  console.log('[extractHashtagClipsBulkV2] Attempting to save', allResults.length, 'hashtag posts to DB.');
  if (allResults.length > 0) {
    console.log('[extractHashtagClipsBulkV2] Data to be inserted:', JSON.stringify(allResults, null, 2));
  if (!supabaseToUse) throw new Error("Supabase client not initialized");
  const { error: postsError } = await supabaseToUse
      .from("extracted_hashtag_posts")
      .insert(allResults);
    if (postsError) {
      console.error("[extractHashtagClipsBulkV2] Error saving hashtag posts:", postsError);
      if (postsError.details) {
        console.error('[extractHashtagClipsBulkV2] Supabase error details:', postsError.details);
      }
      if (postsError.message) {
        console.error('[extractHashtagClipsBulkV2] Supabase error message:', postsError.message);
      }
    } else {
      console.log(`[extractHashtagClipsBulkV2] Hashtag posts saved to DB successfully. Total:`, allResults.length);
    }
  } else {
    console.warn("[extractHashtagClipsBulkV2] No hashtag posts extracted, skipping DB save.");
  }
  console.log('[extractHashtagClipsBulkV2] Extraction complete. Returning', allResults.length, 'clips.');
   return { clips: allResults };
}

// Single-page hashtag clips fetch for batching (no internal loops)
export async function getHashtagClipsPage(
  hashtag: string,
  page_id?: string,
  filters?: Record<string, unknown>
): Promise<{ items: any[]; next_page_id?: string }> {
  const params: Record<string, unknown> = { name: hashtag };
  if (page_id) params.page_id = page_id;
  if (filters) {
    const { hashtagLimit, ...apiFilterParams } = filters as Record<string, unknown>;
    Object.assign(params, apiFilterParams);
  }
  const res = await getHikerClient().get("/v2/hashtag/medias/clips", { params });
  const data = res.data ?? {};
  const sections = data?.response?.sections ?? [];
  const items: any[] = [];
  for (const section of sections) {
    const oneByTwoClips = section?.layout_content?.one_by_two_item?.clips?.items;
    if (Array.isArray(oneByTwoClips)) items.push(...oneByTwoClips);
    const fillItems = section?.layout_content?.fill_items;
    if (Array.isArray(fillItems)) {
      for (const item of fillItems) {
        if (item?.media) items.push(item.media);
      }
    }
  }
  const nextPageId = typeof data?.next_page_id === 'string' && data.next_page_id
    ? data.next_page_id
    : (typeof data?.response?.next_page_id === 'string' && data.response.next_page_id ? data.response.next_page_id : undefined);
  return { items, next_page_id: nextPageId };
}



/*****************************************************/
/**          FILTERED FOLLOWERS EXTRACTION          **/
/*****************************************************/



// Generic user type for dynamic extraction
interface UserLike {
  username: string;
  [key: string]: unknown;
}




// Generic extraction/filtering function for any user-like array
export async function extractFilteredUsers<T extends UserLike>(
  users: T[],
  filters: FilterOptions,
  getDetails: (username: string) => Promise<UserDetails>
): Promise<ExtractedUser[]> {
  console.log('[Backend] [extractFilteredUsers] Filtering users with filters:', filters);
  const usernames = users.map(u => u.username);
  console.log('[Backend] [extractFilteredUsers] Usernames before filtering:', usernames);
  const filteredUsers: ExtractedUser[] = [];
  for (const userObj of users) {
    // Get detailed info for each user (followers, followings, likers, etc.)
    let userDetails: UserDetails | undefined;
    try {
      userDetails = await getDetails(userObj.username);
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as { response?: { status?: number } }).response;
        if (response && typeof response.status === 'number') {
          if (response.status === 404) {
            console.warn('[Backend] [extractFilteredUsers] User not found (404):', userObj.username);
            continue;
          }
          if (response.status === 403) {
            console.warn('[Backend] [extractFilteredUsers] User is forbidden(account, media or comment is private) (403):', userObj.username);
            continue;
          }
        }
      }
      // For other errors, rethrow
      throw err;
    }
    if (!userDetails) {
      console.warn('[Backend] [extractFilteredUsers] No user details returned for:', userObj.username);
      continue;
    }


    // STOP IF logic: If any stop word is found in name or bio, stop extraction and return collected users
    if (filters.filterByNameInBioStop) {
      const stopWords = String(filters.filterByNameInBioStop)
        .split(/\r?\n/)
        .map(w => w.trim())
        .filter(Boolean);
      if (stopWords.length > 0) {
        const fullName = (userDetails.full_name || "").toLowerCase();
        const biography = (userDetails.biography || "").toLowerCase();
        const foundStop = stopWords.some(word => fullName.includes(word.toLowerCase()) || biography.includes(word.toLowerCase()));
        if (foundStop) {
          console.log('[Backend] [extractFilteredUsers] STOP IF triggered: Found stop word in name/bio:', userDetails.username);
          break; // Stop further extraction and return collected users
        }
      }
    }

    console.log('[Backend] [extractFilteredUsers] Checking user:', userDetails.username, userDetails);
    filterUser(userDetails, filters)
    if (!filterUser(userDetails, filters)) {
      console.log('[Backend] [extractFilteredUsers] User did NOT pass filters:', userDetails.username);
      continue;
    }
    // Prepare contact/link data to save
    // Combine phone numbers if both are present
    let phoneValue: string | null | undefined = undefined;
    if (filters.extractPhone) {
      const publicPhone = userDetails.public_phone_number ? userDetails.public_phone_number.trim() : "";
      const contactPhone = userDetails.contact_phone_number ? userDetails.contact_phone_number.trim() : "";
      if (publicPhone && contactPhone) {
        phoneValue = `${publicPhone},${contactPhone}`;
      } else if (publicPhone) {
        phoneValue = publicPhone;
      } else if (contactPhone) {
        phoneValue = contactPhone;
      } else {
        phoneValue = null;
      }
    }
    // Extract link from biography if requested
    let linkInBioValue: string | null | undefined = undefined;
    if (filters.extractLinkInBio) {
      // Regex to find URLs in biography
      const bio = userDetails.biography || "";
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = bio.match(urlRegex);
      if (matches && matches.length > 0) {
        linkInBioValue = matches.join(",");
      } else if (userDetails.link_in_bio) {
        linkInBioValue = userDetails.link_in_bio;
      } else {
        linkInBioValue = null;
      }
    }

    const saveData: ExtractedUser = {
      username: userDetails.username,
      full_name: userDetails.full_name,
      phone: phoneValue,
      email: filters.extractEmail ? userDetails.public_email || null : undefined,
      link_in_bio: filters.extractLinkInBio ? linkInBioValue : undefined,
      pk: userDetails.pk,
      profile_pic_url: userDetails.profile_pic_url,
      is_private: userDetails.is_private,
      is_verified: userDetails.is_verified,
      is_business: userDetails.is_business,
    };
    console.log('[Backend] [extractFilteredUsers] User PASSED filters and will be saved:', saveData);
    filteredUsers.push(saveData);
  }
  console.log('[Backend] [extractFilteredUsers] Users after filtering:', filteredUsers.length);
  return filteredUsers;
}


// Reusable filter function for user objects
export function filterUser(user: UserDetails, filters: FilterOptions): boolean {
  console.log('[filterUser] Filters received:', filters);
  // Profile flags
  const flagChecks = [
    { key: "privacy", value: user.is_private, filter: filters.privacy },
    { key: "profilePicture", value: !!user.profile_pic_url, filter: filters.profilePicture },
    { key: "verifiedAccount", value: user.is_verified, filter: filters.verifiedAccount },
    { key: "businessAccount", value: user.is_business, filter: filters.businessAccount },
  ];
  for (const { key, filter, value } of flagChecks) {
    if (filter === "yes" && !value) {
      console.log(`[filterUser] Flag check failed: ${key} expected yes, got value:`, value);
      return false;
    }
    if (filter === "no" && value) {
      console.log(`[filterUser] Flag check failed: ${key} expected no, got value:`, value);
      return false;
    }
    console.log(`[filterUser] Flag check passed: ${key}, filter: ${filter}, value:`, value);
  }

  // Filter by username exclude list
  console.log('[filterUser] Checking username exclude list...');
  console.log('[filterUser] filters.filterByName:', filters.filterByName);
  if (filters.filterByName) {
    const rawExcludeList = String(filters.filterByName);
    console.log('[filterUser] Raw exclude list:', rawExcludeList);
    const excludeUsernames = rawExcludeList
      .split(/\r?\n/)
      .map(u => u.trim().toLowerCase())
      .filter(Boolean);
    console.log('[filterUser] Normalized exclude list:', excludeUsernames);
    const usernameNormalized = user.username.toLowerCase();
    console.log('[filterUser] Normalized username:', usernameNormalized);
    if (excludeUsernames.length > 0) {
      const match = excludeUsernames.includes(usernameNormalized);
      console.log(`[filterUser] Username exclude check: username=${user.username}, excludeList=`, excludeUsernames, 'match:', match);
      if (match) {
        console.log(`[filterUser] User ${user.username} excluded by filterByName.`);
        return false;
      } else {
        console.log(`[filterUser] User ${user.username} NOT excluded by filterByName.`);
      }
    }
  }

  // Filter by name in bio contains only
  if (filters.filterByNameInBioContains) {
    // Split words by line, trim, and filter out empty
    const words = String(filters.filterByNameInBioContains)
      .split(/\r?\n/)
      .map(w => w.trim())
      .filter(Boolean);
    if (words.length > 0) {
      const fullName = (user.full_name || "").toLowerCase();
      const biography = (user.biography || "").toLowerCase();
      const found = words.some(word => fullName.includes(word.toLowerCase()) || biography.includes(word.toLowerCase()));
      console.log(`[filterUser] Name/Bio contains check: words=`, words, 'fullName=', fullName, 'biography=', biography, 'found:', found);
      if (!found) return false;
    }
  }
  
  // Follower/following ranges
  if (filters.followersMin && (typeof user.follower_count !== 'number' || user.follower_count < Number(filters.followersMin))) {
    console.log(`[filterUser] Follower min check failed: min=${filters.followersMin}, actual=`, user.follower_count);
    return false;
  }
  if (filters.followersMax && (typeof user.follower_count !== 'number' || user.follower_count > Number(filters.followersMax))) {
    console.log(`[filterUser] Follower max check failed: max=${filters.followersMax}, actual=`, user.follower_count);
    return false;
  }
  if (filters.followingsMin && (typeof user.following_count !== 'number' || user.following_count < Number(filters.followingsMin))) {
    console.log(`[filterUser] Following min check failed: min=${filters.followingsMin}, actual=`, user.following_count);
    return false;
  }
  if (filters.followingsMax && (typeof user.following_count !== 'number' || user.following_count > Number(filters.followingsMax))) {
    console.log(`[filterUser] Following max check failed: max=${filters.followingsMax}, actual=`, user.following_count);
    return false;
  }
  return true;
}



  /***********************************/
 /**          MEDIA BY URL         **/
/***********************************/




export async function mediaByUrlV1(url: string) {
  try {
    const params: Record<string, unknown> = { url };
    const res = await getHikerClient().get("/v1/media/by/url", { params });
    return res.data;
  } catch (error: unknown) {
    handleHikerError(error);
  }
}