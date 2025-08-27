  // Type for hashtag clip objects
  type HashtagClip = {
    id?: string;
    pk?: string;
    media_url?: string;
    video_url?: string;
    image_url?: string;
    taken_at?: number;
    like_count?: number;
    caption?: string;
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
  };

// Type for extracted commenters (for DB insert)
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
// Type definitions for user extraction
// Type definitions for user extraction
import { HikerUser, FilterOptions } from "../utils/types";
import axios from "axios";
import { supabase } from "../supabaseClient";
import { COIN_RULES, deductCoins, getUserCoins } from "../utils/coinLogic";

import { SignJWT, jwtVerify, JWTPayload } from "jose";

const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || "b753b7d56575d996e1f59e0f94f3d005";
const encoder = new TextEncoder();
const getSecret = () => encoder.encode(JWT_SECRET);


export async function generateJWT(payload: Record<string, unknown>): Promise<string> {
  return await new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getSecret());
}


export async function verifyJWT(token: string): Promise<object | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}
const HIKER_API_URL = process.env.NEXT_PUBLIC_HIKER_API_URL || "https://api.hikerapi.com";


console.log("[hikerApi] process.env.NEXT_PUBLIC_HIKER_API_KEY:", process.env.NEXT_PUBLIC_HIKER_API_KEY);
console.log("[hikerApi] process.env.HIKER_API_KEY:", process.env.HIKER_API_KEY);
console.log("[hikerApi] process.env.NODE_ENV:", process.env.NODE_ENV);
const HIKER_API_KEY = process.env.NEXT_PUBLIC_HIKER_API_KEY;
console.log("[hikerApi] HIKER_API_KEY (assigned):", HIKER_API_KEY);

if (!HIKER_API_KEY) {
  throw new Error("NEXT_PUBLIC_HIKER_API_KEY is not set in environment variables");
}

const hikerClient = axios.create({
  baseURL: HIKER_API_URL,
  headers: {
    "x-access-key": HIKER_API_KEY,
    "Content-Type": "application/json",
  },
});



// Get user object by username (returns user info, including pk as user_id)
export async function userByUsernameV1(username: string): Promise<HikerUser | undefined> {
  try {
    const params = { username };
    const res = await hikerClient.get("/v1/user/by/username", { params });
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
// Get a user's followers by username (fetches user_id first)
/**
 * Accepts frontend payload: { target: string | string[], filters: FilterOptions }
 * Resolves user_id(s), fetches followers, filters, and saves to DB.
 */
export async function userFollowersChunkGqlByUsername(payload: { target: string | string[], filters: FilterOptions, force?: boolean, end_cursor?: string }, onProgress?: (count: number) => void) {
  const { target, filters, force, end_cursor } = payload;
  console.log(`[hikerApi] userFollowersChunkGqlByUsername called with target(s):`, target, 'force:', force, 'end_cursor:', end_cursor);
  console.log('[hikerApi] [userFollowersChunkGqlByUsername] Filters received:', filters);
  // Support both single username and array of usernames
  const usernames = Array.isArray(target) ? target : [target];
  const userIds: string[] = [];

  
  for (const uname of usernames) {
    const cleanUsername = uname.replace(/^@/, "");
    const user = await userByUsernameV1(cleanUsername);
    console.log(`[hikerApi] userByUsernameV1 result for ", cleanUsername, ":`, user);
    if (!user || !user.pk) {
      console.error(`[hikerApi] User not found for username:`, cleanUsername);
      continue; // Skip missing users, don't throw
    }
    userIds.push(user.pk);
  }
  // If no userIds found, assign a test user_id for debugging

 
  
  if (userIds.length === 0) {
    throw new Error("No valid user IDs found for provided usernames");
  }
  // Pass array of user IDs to main function for DB save
  // Wrap filters in a Record<string, FilterOptions> for compatibility
  const filtersRecord: Record<string, FilterOptions> = { followers: filters };
  return userFollowersChunkGql(userIds, force, end_cursor, usernames.join(","), filtersRecord, onProgress);
}

// Original function (still available if you already have user_id)
export async function userFollowersChunkGql(user_id: string | string[], force?: boolean, end_cursor?: string, target_username?: string | string[], filters?: Record<string, FilterOptions>, onProgress?: (count: number) => void) {
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
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const userIdStr = userId ?? "";
  let coins = await getUserCoins(userIdStr, supabase);
  let stopExtraction = false;
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
          const res = await hikerClient.get("/v2/user/followers", { params });
          const data = res.data;
          users = data && data.response && Array.isArray(data.response.users) ? data.response.users : [];
          // Deduct coins: 2 coins per 10 users (0.5 per user)
          if (users.length > 0) {
            const chunkCoinCost = Math.ceil(users.length * 0.5); // 0.5 coin per user
            if (coins < chunkCoinCost) {
              stopExtraction = true;
              break;
            }
            const prevFollowersCoins = coins;
            const prevFollowingsCoins = coins;
            coins = await deductCoins(userIdStr, chunkCoinCost, supabase);
            console.log(`[hikerApi] [FollowingV2] Deducted ${chunkCoinCost} coins from user ${userIdStr}. Previous balance: ${prevFollowingsCoins}, New balance: ${coins}`);
            console.log(`[hikerApi] [FollowersV2] Deducted ${chunkCoinCost} coins from user ${userIdStr}. Previous balance: ${prevFollowersCoins}, New balance: ${coins}`);
          }
          if (users.length === 0) {
            console.warn(`[hikerApi] [FollowersV2] Empty or invalid response for user_id ${singleUserId}, skipping coin deduction and DB save for this page.`);
          } else {
            for (const user of users) {
              allFollowers.push(user);
              if (onProgress) onProgress(allFollowers.length);
            }
            if (stopExtraction) break;
            pageCount++;
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
  const perUserTotalCost = allFollowers.length * COIN_RULES.followers.perUser;
  if (coins < perUserTotalCost) {
    stopExtraction = true;
  } else {
    coins = await deductCoins(userIdStr, perUserTotalCost, supabase);
  }
  const result = await extractFilteredUsers(
    allFollowers,
    filterOptions,
    async (username: string): Promise<UserDetails> => (await hikerClient.get("/v1/user/by/username", { params: { username } })).data as UserDetails
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
        const { data: extraction, error: extractionError } = await supabase
          .from("extractions")
          .insert([
            {
              user_id: userId,
              extraction_type: "followers",
              target_username: target_username || null,
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
export async function userFollowingChunkGqlByUsername(payload: { target: string | string[], filters: FilterOptions, force?: boolean, end_cursor?: string }, onProgress?: (count: number) => void) {
  const { target, filters, force, end_cursor } = payload;
  console.log(`[hikerApi] userFollowingChunkGqlByUsername called with target(s):`, target, 'force:', force, 'end_cursor:', end_cursor);
  console.log('[hikerApi] [userFollowingChunkGqlByUsername] Filters received:', filters);
  // Support both single username and array of usernames
  const usernames = Array.isArray(target) ? target : [target];
  const userIds: string[] = [];
  for (const uname of usernames) {
    const cleanUsername = uname.replace(/^@/, "");
    const user = await userByUsernameV1(cleanUsername);
    console.log(`[hikerApi] userByUsernameV1 result for ", cleanUsername, ":`, user);
    if (!user || !user.pk) {
      console.error(`[hikerApi] User not found for username:`, cleanUsername);
      continue; // Skip missing users, don't throw
    }
    userIds.push(user.pk);
  }
  if (userIds.length === 0) {
    throw new Error("No valid user IDs found for provided usernames");
  }
  // Wrap filters in a Record<string, FilterOptions> for compatibility
  const filtersRecord: Record<string, FilterOptions> = { following: filters };
  return userFollowingChunkGql(userIds, force, end_cursor, usernames.join(","), filtersRecord, onProgress);
}

// Original function (still available if you already have user_id)
export async function userFollowingChunkGql(user_id: string | string[], force?: boolean, end_cursor?: string, target_username?: string, filters?: Record<string, FilterOptions>, onProgress?: (count: number) => void) {
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
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const userIdStr: string = userId ?? "";
  let coins: number = await getUserCoins(userIdStr, supabase);
  let stopExtraction: boolean = false;
  const userIds = Array.isArray(user_id) ? user_id : [user_id];
    for (const singleUserId of userIds) {
      let nextPageId: string | undefined = undefined;
      try {
  let users: Following[] = [];
        do {
          const params: Record<string, unknown> = { user_id: singleUserId };
          if (nextPageId) params.page_id = nextPageId;
          const res = await hikerClient.get("/v2/user/following", { params });
          const data = res.data;
          users = data && data.response && Array.isArray(data.response.users) ? data.response.users : [];
          // Deduct coins: 2 coins per 10 users (0.5 per user)
          if (users.length > 0) {
            const chunkCoinCost = Math.ceil(users.length * 0.5); // 0.5 coin per user
            if (coins < chunkCoinCost) {
              stopExtraction = true;
              break;
            }
            coins = await deductCoins(userIdStr, chunkCoinCost, supabase);
          }
          if (users.length === 0) {
            console.warn(`[hikerApi] [FollowingV2] Empty or invalid response for user_id ${singleUserId}, skipping coin deduction and DB save for this page.`);
          } else {
            for (const user of users) {
              allFollowings.push(user);
              if (onProgress) onProgress(allFollowings.length);
            }
            if (stopExtraction) break;
            pageCount++;
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
  if (coins < perUserTotalCost) {
    stopExtraction = true;
  } else {
    coins = await deductCoins(userIdStr, perUserTotalCost, supabase);
  }
  const result = await extractFilteredUsers(
    allFollowings,
    filterOptions,
    async (username: string): Promise<UserDetails> => (await hikerClient.get("/v1/user/by/username", { params: { username } })).data as UserDetails
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
      try {
        const { data: extraction, error: extractionError } = await supabase
          .from("extractions")
          .insert([
            {
              user_id: userId,
              extraction_type: "following",
              target_username: target_username || null,
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
        } else if (extraction && extraction.id) {
          for (const user of filteredFollowings) {
            (user as ExtractedUser).extraction_id = extraction.id;
          }
          if (filteredFollowings.length > 0) {
            const { error: usersError } = await supabase
              .from("extracted_users")
              .insert(filteredFollowings);
            if (usersError) {
              console.error("[hikerApi] Error saving extracted users:", usersError);
            }
          }
          // Deduct coins for current user
          try {
            const { data: userData, error: coinsError } = await supabase
              .from("users")
              .select("coins")
              .eq("id", userId)
              .single();
            if (!coinsError && userData && typeof userData.coins === "number") {
              const newCoins = Math.max(0, userData.coins - filteredFollowings.length);
              const { error: updateError } = await supabase
                .from("users")
                .update({ coins: newCoins })
                .eq("id", userId);
              if (updateError) {
                console.error(`[hikerApi] Error updating coins:`, updateError);
              } else {
                console.log(`[hikerApi] Coins updated. Deducted:`, filteredFollowings.length, `New balance:`, newCoins);
              }
            } else {
              console.error(`[hikerApi] Error fetching coins for deduction:`, coinsError);
            }
          } catch (err) {
            console.error(`[hikerApi] Exception during coin deduction:`, err);
          }
        }
      } catch (err) {
        console.error("[hikerApi] Exception during DB save:", err);
      }
    } else {
      console.warn(`[hikerApi] [FollowingV2] No filtered followings found, skipping DB save and coin deduction.`);
    }
    return filteredFollowings;
  } catch (error: unknown) {
    console.error('[hikerApi] userFollowingChunkGql actual error:', error);
    handleHikerError(error);
  }
}


/***********************************************************/
/**                LIKERS API CALL METHOD              **/
/***********************************************************/

// Bulk likers extraction for multiple post URLs
export async function mediaLikersBulkV1(payload: { urls: string[], filters: FilterOptions }, onProgress?: (count: number) => void) {
  // Coin deduction logic
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const userIdStr: string = userId ?? "";
  let coins: number = await getUserCoins(userIdStr, supabase);
  let stopExtraction: boolean = false;
  const { urls, filters } = payload;
  // Support both array and single string with newlines
  const urlList: string[] = Array.isArray(urls)
    ? urls.flatMap(u => String(u).split(/\r?\n/))
    : String(urls).split(/\r?\n/);
  const cleanUrls = urlList.map(u => u.trim()).filter(Boolean);
  const allLikers: UserLike[] = [];
  const errorMessages: string[] = [];
  for (const url of cleanUrls) {
    try {
      const mediaObj = await mediaByUrlV1(url);
      if (!mediaObj || !mediaObj.id) {
        errorMessages.push(`Could not get media ID for URL: ${url}`);
        continue;
      }
      const params: Record<string, unknown> = { id: mediaObj.id };
      const res = await hikerClient.get("/v1/media/likers", { params });
      let newLikers = [];
      if (Array.isArray(res.data)) {
        newLikers = res.data;
      } else if (Array.isArray(res.data?.users)) {
        newLikers = res.data.users;
      } else {
        errorMessages.push(`No likers found for media ID: ${mediaObj.id}`);
      }
      // Deduct coins: 2 coins per 10 users (0.5 per user)
      if (newLikers.length > 0) {
        const chunkCoinCost = Math.ceil(newLikers.length * 0.5); // 0.5 coin per user
        if (coins < chunkCoinCost) {
          stopExtraction = true;
          break;
        }
        coins = await deductCoins(userIdStr, chunkCoinCost, supabase);
      }
      for (const liker of newLikers) {
        allLikers.push(liker);
        if (onProgress) onProgress(allLikers.length);
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

  // Deduct coins for all likers before fetching details
  const perUserTotalCost = preFilteredLikers.length * COIN_RULES.likers.perUser;
  if (coins < perUserTotalCost) {
    stopExtraction = true;
  } else {
    coins = await deductCoins(userIdStr, perUserTotalCost, supabase);
  }
  // 2. Fetch details for each remaining user
  const detailedLikers: UserDetails[] = [];
  if (!stopExtraction) {
    for (const liker of preFilteredLikers) {
      try {
        const details = await userByUsernameV1(liker.username);
        if (details) {
          detailedLikers.push(details);
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
        errorMessages.push(`Error fetching details for username: ${liker.username} - ${String(err)}`);
      }
    }
  }
  console.log('[mediaLikersBulkV1] Detailed likers fetched:', detailedLikers.length, detailedLikers);

  // 3. Call extractFilteredUsers with detailed users
  const filteredLikers = await extractFilteredUsers(
    detailedLikers as unknown as UserLike[],
    filters,
    async (username: string): Promise<UserDetails> => detailedLikers.find(u => u.username === username) as UserDetails
  );
  console.log('[mediaLikersBulkV1] Likers after filtering:', filteredLikers.length, filteredLikers);

  // Save filtered likers to database with extraction record
  if (filteredLikers.length > 0) {
    try {
      // Create extraction record
      const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
      const extractionType = "likers";
      const targetUsernames = cleanUrls.join(",");
      const requestedAt = new Date().toISOString();
      const completedAt = new Date().toISOString();
      const pageCount = cleanUrls.length;
      const extractionInsert = {
        user_id: userId,
        extraction_type: extractionType,
        target_username: targetUsernames,
        target_user_id: null,
        requested_at: requestedAt,
        completed_at: completedAt,
        status: "completed",
        page_count: pageCount,
        next_page_id: null,
        error_message: null,
      };
      const { data: extraction, error: extractionError } = await supabase
        .from("extractions")
        .insert([extractionInsert])
        .select()
        .single();
      if (extractionError) {
        errorMessages.push("Error saving extraction record: " + String(extractionError.message));
      } else if (extraction && extraction.id) {
        // Attach extraction_id to each liker
        for (const liker of filteredLikers) {
          liker.extraction_id = extraction.id;
        }
        console.log('[mediaLikersBulkV1] Extraction record created with ID:', extraction.id);
        // Save likers to extracted_users
        const { error: usersError } = await supabase
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
//     const res = await hikerClient.get("/v1/media/likers", { params });
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
export async function extractCommentersBulkV2(payload: { urls: string[], filters: FilterOptions }, onProgress?: (count: number) => void) {
  // Coin deduction logic
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const userIdStr: string = userId ?? "";
  let coins: number = await getUserCoins(userIdStr, supabase);
  let commentersSinceLastDeduction = 0;

  const cleanUrls = Array.isArray(payload.urls)
    ? payload.urls.flatMap((u: string) => String(u).split(/\r?\n/))
    : String(payload.urls).split(/\r?\n/);
  const cleanUrlsTrimmed = cleanUrls.map(u => u.trim()).filter(Boolean);
  console.log('[extractCommentersBulkV2] URLs received:', cleanUrlsTrimmed);
  const allComments = [];
  const errorMessages: string[] = [];
  let stopExtraction = false;
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
            if (coins < COIN_RULES.commenters.perChunk.coins) {
              stopExtraction = true;
              break;
            }
            const prevCommentersCoins = coins;
            coins = await deductCoins(userIdStr, COIN_RULES.commenters.perChunk.coins, supabase);
            console.log(`[hikerApi] [CommentersV2] Deducted ${COIN_RULES.commenters.perChunk.coins} coins from user ${userIdStr}. Previous balance: ${prevCommentersCoins}, New balance: ${coins}`);
            commentersSinceLastDeduction = 0;
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
      const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
      const extractionType = "commenters";
      const targetUsernames = cleanUrlsTrimmed.join(",");
      const requestedAt = new Date().toISOString();
      const completedAt = new Date().toISOString();
      const pageCount = cleanUrlsTrimmed.length;
      const extractionInsert = {
        user_id: userId,
        extraction_type: extractionType,
        target_username: targetUsernames,
        target_user_id: null,
        requested_at: requestedAt,
        completed_at: completedAt,
        status: "completed",
        page_count: pageCount,
        next_page_id: null,
        error_message: null,
      };
      console.log('[extractCommentersBulkV2] Saving extraction record:', extractionInsert);
      const { data: extraction, error: extractionError } = await supabase
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
        const { error: commentsError } = await supabase
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
    const res = await hikerClient.get("/v2/media/comments", { params });
    console.log('[mediaCommentsV2] Hiker API response:', JSON.stringify(res.data, null, 2));
    return res.data;
  } catch (error: unknown) {
    handleHikerError(error);
  }
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

export async function getUserPosts(payload: { target: string | string[], filters?: FilterOptions }, onProgress?: (count: number) => void) {
  // Coin deduction logic
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const userIdStr: string = userId ?? "";
  let coins: number = await getUserCoins(userIdStr, supabase);
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
        res = await hikerClient.get("/v2/user/medias", { params });
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
        // Deduct coins: 2 coins per post
        if (coins < COIN_RULES.posts.perPost) {
          stopExtraction = true;
          break;
        }
  const prevPostsCoins = coins;
  coins = await deductCoins(userIdStr, COIN_RULES.posts.perPost, supabase);
  console.log(`[hikerApi] [PostsV2] Deducted ${COIN_RULES.posts.perPost} coins from user ${userIdStr}. Previous balance: ${prevPostsCoins}, New balance: ${coins}`);
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
      // Get userId from localStorage (frontend) or pass in payload if available
      const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
      const extractionType = "posts";
      const targetUsernames = usernames.join(",");
      const requestedAt = new Date().toISOString();
      const completedAt = new Date().toISOString();
      const pageCount = extractedPosts.length; // or use actual page count if needed
      // Create extraction record
      const extractionInsert = {
        user_id: userId,
        extraction_type: extractionType,
        target_username: targetUsernames,
        target_user_id: null,
        requested_at: requestedAt,
        completed_at: completedAt,
        status: "completed",
        page_count: pageCount,
        next_page_id: null,
        error_message: null,
      };
      console.log('[getUserPosts] Inserting extraction record:', extractionInsert);
      const { data: extraction, error: extractionError } = await supabase
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
        const { error: postsError } = await supabase
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
 * @param payload { hashtags: string[], filters: any }
 */
export async function extractHashtagClipsBulkV2(payload: { hashtags: string[], filters?: Record<string, unknown>, extraction_id?: number }, onProgress?: (count: number) => void) {
  const { hashtags, filters } = payload;
  // Extract hashtagLimit from filters, ensure it's a number
  const hashtagLimit = filters && typeof filters.hashtagLimit === 'number' ? filters.hashtagLimit : (filters && typeof filters.hashtagLimit === 'string' ? Number(filters.hashtagLimit) : undefined);
  console.log('[extractHashtagClipsBulkV2] hashtagLimit extracted:', hashtagLimit, 'from filters:', filters);
  // 1. Create extraction record
  console.log('[extractHashtagClipsBulkV2] Starting hashtag extraction for:', hashtags);
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const userIdStr: string = userId ?? "";
  let coins: number = await getUserCoins(userIdStr, supabase);
  const extractionType = "hashtags";
  const targetUsernames = hashtags.join(",");
  const requestedAt = new Date().toISOString();
  const extractionInsert = {
    user_id: userId,
    extraction_type: extractionType,
    target_username: targetUsernames,
    target_user_id: null,
    requested_at: requestedAt,
    status: "completed",
    page_count: hashtags.length,
    next_page_id: null,
    error_message: null,
  };
  console.log('[extractHashtagClipsBulkV2] Inserting extraction record:', extractionInsert);
  const { data: extraction, error: extractionError } = await supabase
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
        const res = await hikerClient.get("/v2/hashtag/medias/clips", { params });

        // Normalize clips from possible response shapes
        const data = res.data ?? {};
        let clips: HashtagClip[] = [];
        if (Array.isArray(data?.clips)) {
          clips = data.clips as HashtagClip[];
        } else if (Array.isArray(data?.response?.items)) {
          clips = data.response.items as HashtagClip[];
        } else if (Array.isArray(data?.items)) {
          clips = data.items as HashtagClip[];
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
            coins = await deductCoins(userIdStr, 10, supabase);
            console.log(`[hikerApi] [HashtagV2] Deducted 10 coins from user ${userIdStr}. Previous balance: ${prevHashtagCoins}, New balance: ${coins}`);

            const dbRow = {
              extraction_id,
              post_id: clip.id || clip.pk || null,
              media_url: clip.media_url || clip.video_url || clip.image_url || null,
              taken_at: clip.taken_at ? new Date(clip.taken_at * 1000).toISOString() : null,
              like_count: clip.like_count || 0,
              caption: clip.caption || clip.caption_text || null,
              hashtags: Array.isArray(clip.hashtags) ? clip.hashtags.join(",") : (clip.hashtags || null),
              username: clip.username || (clip.user && clip.user.username) || null,
              full_name: (clip.user && clip.user.full_name) || null,
              profile_pic_url: (clip.user && clip.user.profile_pic_url) || null,
              is_verified: (clip.user && clip.user.is_verified) || false,
              is_private: (clip.user && clip.user.is_private) || false,
            };
            console.log(`[extractHashtagClipsBulkV2] Saving dbRow to allResults:`, JSON.stringify(dbRow, null, 2));
            allResults.push(dbRow);
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
    const { error: postsError } = await supabase
      .from("extracted_hashtag_posts")
      .insert(allResults);
    if (postsError) {
      console.error("[extractHashtagClipsBulkV2] Error saving hashtag posts:", postsError);
    } else {
      console.log(`[extractHashtagClipsBulkV2] Hashtag posts saved to DB successfully. Total:`, allResults.length);
    }
  } else {
    console.warn("[extractHashtagClipsBulkV2] No hashtag posts extracted, skipping DB save.");
  }
  console.log('[extractHashtagClipsBulkV2] Extraction complete. Returning', allResults.length, 'clips.');
   return { clips: allResults };
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
    const res = await hikerClient.get("/v1/media/by/url", { params });
    return res.data;
  } catch (error: unknown) {
    handleHikerError(error);
  }
}