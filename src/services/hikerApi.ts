// Type definitions for user extraction
export interface UserDetails {
  username: string;
  full_name: string;
  profile_pic_url?: string;
  is_private?: boolean;
  is_verified?: boolean;
  is_business?: boolean;
  phone_number?: string;
  email?: string;
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
import { HikerUser } from "../utils/types";
import axios from "axios";
import { supabase } from "../supabaseClient";

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
export async function userFollowersChunkGqlByUsername(username: string, force?: boolean, end_cursor?: string, filters?: Record<string, FilterOptions>) {
  console.log(`[hikerApi] userFollowersChunkGqlByUsername called with username:`, username, 'force:', force, 'end_cursor:', end_cursor, 'filters:', filters);
  // const cleanUsername = username.replace(/^@/, "");
  // const userDetails = await userByUsernameV1(cleanUsername); // unused
  const user = await userByUsernameV1(username);
  console.log(`[hikerApi] userByUsernameV1 result:`, user);
  if (!user || !user.pk) {
    console.error(`[hikerApi] User not found for username:`, username);
    throw new Error("User not found");
  }
  // Pass username to main function for DB save
  return userFollowersChunkGql(user.pk, force, end_cursor, username, filters);
}

// Original function (still available if you already have user_id)
export async function userFollowersChunkGql(user_id: string, force?: boolean, end_cursor?: string, target_username?: string, filters?: Record<string, FilterOptions>) {
  try {
    type Follower = {
      pk: string;
      username: string;
      full_name: string;
      profile_pic_url: string;
      is_private: boolean;
      is_verified: boolean;
    };
    let allFollowers: Follower[] = [];
  console.log('[Backend] Received extraction request with filters:', filters);
  // let filteredFollowers: Follower[] = [];
    let nextPageId: string | undefined = undefined;
    let pageCount = 0;
    const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
    do {
        const params: Record<string, unknown> = { user_id };
        if (nextPageId) params.page_id = nextPageId;
        const res = await hikerClient.get("/v2/user/followers", { params });
        const data = res.data;
        const users = data && data.response && Array.isArray(data.response.users) ? data.response.users : [];
        if (users.length === 0) {
          console.warn(`[hikerApi] [FollowersV2] Empty or invalid response, skipping coin deduction and DB save for this page.`);
        } else {
          allFollowers = allFollowers.concat(users);
          pageCount++;
        }
        nextPageId = typeof data.next_page_id === 'string' && data.next_page_id ? data.next_page_id : undefined;
        console.log(`[hikerApi] [FollowersV2] Next page id:`, nextPageId);
      } while (nextPageId);
       const safeFilters = filters || {};
       console.log('[Backend] Starting filtering process. Total users before filtering:', allFollowers.length);
       const result = await extractFilteredUsers(
         allFollowers,
         safeFilters,
         async (username: string): Promise<UserDetails> => (await hikerClient.get("/v1/user/by/username", { params: { username } })).data as UserDetails
       );
       // Ensure all required columns are present for each user
  const filteredFollowers = result.map((user: ExtractedUser) => ({
         // Always present fields
         pk: user.pk,
         username: user.username,
         full_name: user.full_name,
         profile_pic_url: user.profile_pic_url,
         is_private: user.is_private,
         is_verified: user.is_verified,
         // Optional fields based on filters
         email: safeFilters.extractEmail ? user.email ?? null : null,
         phone: safeFilters.extractPhone ? user.phone ?? null : null,
         link_in_bio: safeFilters.extractLinkInBio ? user.link_in_bio ?? null : null,
         is_business: typeof user.is_business !== 'undefined' ? user.is_business : null,
         // extraction_id will be added before DB insert
       }));
       console.log('[Backend] Filtering complete. Total users after filtering:', filteredFollowers.length);
       console.log('[Backend] Filters used:', safeFilters);
    console.log(`[hikerApi] [FollowersV2] Total followers collected:`, allFollowers.length);
    // Save extraction and extracted users to DB only if followers found
    if (userId && filteredFollowers.length > 0) {
      try {
        // Insert extraction row
        const { data: extraction, error: extractionError } = await supabase
          .from("extractions")
          .insert([
            {
              user_id: userId,
              extraction_type: "followers",
              target_username: target_username || null,
              target_user_id: user_id,
              requested_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
              status: "completed",
              page_count: pageCount,
              next_page_id: nextPageId,
              error_message: null,
            },
          ])
          .select()
          .single();
        if (extractionError) {
          console.error("[hikerApi] Error saving extraction:", extractionError);
        } else if (extraction && extraction.id) {
          // Insert extracted users
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
          // Deduct coins for current user
          try {
            const { data: userData, error: coinsError } = await supabase
              .from("users")
              .select("coins")
              .eq("id", userId)
              .single();
            if (!coinsError && userData && typeof userData.coins === "number") {
              const newCoins = Math.max(0, userData.coins - filteredFollowers.length);
              const { error: updateError } = await supabase
                .from("users")
                .update({ coins: newCoins })
                .eq("id", userId);
              if (updateError) {
                console.error(`[hikerApi] Error updating coins:`, updateError);
              } else {
                console.log(`[hikerApi] Coins updated. Deducted:`, filteredFollowers.length, `New balance:`, newCoins);
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
      console.warn(`[hikerApi] [FollowersV2] No filtered followers found, skipping DB save and coin deduction.`);
    }
    return filteredFollowers;
  } catch (error: unknown) {
    console.error('[hikerApi] userFollowersChunkGqlV2 actual error:', error);
    handleHikerError(error);
  }
}


/***********************************************************/
/**                FOLLOWING API CALL METHOD              **/
/***********************************************************/


// Get a user's followings (one page) with cursor
// Get a user's followings by username (fetches user_id first)
export async function userFollowingChunkGqlByUsername(username: string, force?: boolean, end_cursor?: string, filters?: Record<string, FilterOptions>) {
  
  const user = await userByUsernameV1(username);
  console.log(`[hikerApi] userByUsernameV1 result:`, user);
  if (!user || !user.pk) throw new Error("User not found");
  return userFollowingChunkGql(user.pk, force, end_cursor, username, filters);
}

// Original function (still available if you already have user_id)
export async function userFollowingChunkGql(user_id: string, force?: boolean, end_cursor?: string, target_username?: string, filters?: Record<string, FilterOptions>) {
  try {
    type Following = {
      pk: string;
      username: string;
      full_name: string;
      profile_pic_url: string;
      is_private: boolean;
      is_verified: boolean;
    };
    let allFollowings: Following[] = [];
    let nextPageId: string | undefined = undefined;
    let pageCount = 0;
    const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
    do {
  const params: Record<string, unknown> = { user_id, ...(filters || {}) };
      if (nextPageId) params.page_id = nextPageId;
      console.log(`[hikerApi] [FollowingV2] Calling /v2/user/following with params:`, params);
      
      const res = await hikerClient.get("/v2/user/following", { params });
      
      console.log(`[hikerApi] [FollowingV2] API response:`, res.data);
      
      // Response structure: { response: { users: [...] }, next_page_id: "..." }
      const data = res.data;
      const users = data && data.response && Array.isArray(data.response.users) ? data.response.users : [];
      
      console.log(`[hikerApi] [FollowingV2] Extracted users count:`, users.length);
      
      if (users.length === 0) {
        console.warn(`[hikerApi] [FollowingV2] Empty or invalid response, skipping coin deduction and DB save for this page.`);
      } else {
        allFollowings = allFollowings.concat(users);
        pageCount++;
      }
      nextPageId = typeof data.next_page_id === 'string' && data.next_page_id ? data.next_page_id : undefined;
      console.log(`[hikerApi] [FollowingV2] Next page id:`, nextPageId);
    } while (nextPageId);

    console.log(`[hikerApi] [FollowingV2] Total followings collected:`, allFollowings.length);
    // Save extraction and extracted users to DB only if followings found
    if (userId && allFollowings.length > 0) {
      try {
        // Insert extraction row
        const { data: extraction, error: extractionError } = await supabase
          .from("extractions")
          .insert([
            {
              user_id: userId,
              extraction_type: "following",
              target_username: target_username || null, // You may want to pass username as param
              target_user_id: user_id,
              requested_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
              status: "completed",
              page_count: pageCount,
              next_page_id: nextPageId,
              error_message: null,
            },
          ])
          .select()
          .single();
        if (extractionError) {
          console.error("[hikerApi] Error saving extraction:", extractionError);
        } else if (extraction && extraction.id) {
          // Insert extracted users
          const extractedUsers = allFollowings.map((u: Following) => ({
            extraction_id: extraction.id,
            pk: u.pk,
            username: u.username,
            full_name: u.full_name,
            profile_pic_url: u.profile_pic_url,
            is_private: u.is_private,
            is_verified: u.is_verified,
          }));
          if (extractedUsers.length > 0) {
            const { error: usersError } = await supabase
              .from("extracted_users")
              .insert(extractedUsers);
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
              const newCoins = Math.max(0, userData.coins - allFollowings.length);
              const { error: updateError } = await supabase
                .from("users")
                .update({ coins: newCoins })
                .eq("id", userId);
              if (updateError) {
                console.error(`[hikerApi] Error updating coins:`, updateError);
              } else {
                console.log(`[hikerApi] Coins updated. Deducted:`, allFollowings.length, `New balance:`, newCoins);
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
      console.warn(`[hikerApi] [FollowingV2] No followings found, skipping DB save and coin deduction.`);
    }
    return allFollowings;
  } catch (error: unknown) {
    console.error('[hikerApi] userFollowingChunkGql actual error:', error);
    handleHikerError(error);
  }
}


/***********************************************************/
/**                LIKERS API CALL METHOD              **/
/***********************************************************/

// Get media likers
export async function mediaLikersV1(url: string) {
  try {
    const mediaObj = await mediaByUrlV1(url);
    const params: Record<string, unknown> = { id: mediaObj.id };
    const res = await hikerClient.get("/v1/media/likers", { params });
    return res.data;
  } catch (error: unknown) {
    handleHikerError(error);
  }
}


// Get media object by post URL (returns pk/id)
export async function mediaByUrlV1(url: string) {
  try {
    const params: Record<string, unknown> = { url };
    const res = await hikerClient.get("/v1/media/by/url", { params });
    return res.data;
  } catch (error: unknown) {
    handleHikerError(error);
  }
}




// Get media comments (commenters)
export async function mediaCommentsV2(id: string, can_support_threading?: boolean, page_id?: string) {
  try {
    const params: Record<string, unknown> = { id };
    if (can_support_threading !== undefined) params.can_support_threading = can_support_threading;
    if (page_id !== undefined) params.page_id = page_id;
    const res = await hikerClient.get("/v2/media/comments", { params });
    return res.data;
  } catch (error: unknown) {
    handleHikerError(error);
  }
}

// Example for posts (media):
export async function userMediaChunkGql(user_id: string, end_cursor?: string) {
  try {
    const params: Record<string, unknown> = { user_id };
    if (end_cursor !== undefined) params.end_cursor = end_cursor;
    const res = await hikerClient.get("/gql/user/media/chunk", { params });
    return res.data;
  } catch (error: unknown) {
    handleHikerError(error);
  }
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

/***********************************************************/
/**                FILTERED FOLLOWERS EXTRACTION          **/
/***********************************************************/


// Type definitions for better safety
interface FilterOptions {
  privacy?: string;
  profilePicture?: string;
  verifiedAccount?: string;
  businessAccount?: string;
  followersMin?: number;
  followersMax?: number;
  followingsMin?: number;
  followingsMax?: number;
  extractPhone?: boolean;
  extractEmail?: boolean;
  extractLinkInBio?: boolean;
  filterByNameInBioContains?: string;
}


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
    console.log('[Backend] [extractFilteredUsers] Checking user:', userDetails.username, userDetails);
    if (!filterUser(userDetails, filters)) {
      console.log('[Backend] [extractFilteredUsers] User did NOT pass filters:', userDetails.username);
      continue;
    }
    // Prepare contact/link data to save
    const saveData: ExtractedUser = {
      username: userDetails.username,
      full_name: userDetails.full_name,
      phone: filters.extractPhone ? userDetails.phone_number || null : undefined,
      email: filters.extractEmail ? userDetails.email || null : undefined,
      link_in_bio: filters.extractLinkInBio ? userDetails.link_in_bio || null : undefined,
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
  // Profile flags
  const flagChecks = [
    { key: "privacy", value: user.is_private, filter: filters.privacy },
    { key: "profilePicture", value: !!user.profile_pic_url, filter: filters.profilePicture },
    { key: "verifiedAccount", value: user.is_verified, filter: filters.verifiedAccount },
    { key: "businessAccount", value: user.is_business, filter: filters.businessAccount },
  ];
  for (const { filter, value } of flagChecks) {
    if (filter === "yes" && !value) return false;
    if (filter === "no" && value) return false;
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
  // follower/following count filters
  if (filters.followersMin && (user.follower_count === undefined || user.follower_count < Number(filters.followersMin))) return false;
  if (filters.followersMax && (user.follower_count === undefined || user.follower_count > Number(filters.followersMax))) return false;
  if (filters.followingsMin && (user.following_count === undefined || user.following_count < Number(filters.followingsMin))) return false;
  if (filters.followingsMax && (user.following_count === undefined || user.following_count > Number(filters.followingsMax))) return false;
      // If none of the words are found, filter out
      const found = words.some(word => fullName.includes(word.toLowerCase()) || biography.includes(word.toLowerCase()));
      if (!found) return false;
    }
  }

  // Follower/following ranges
  if (filters.followersMin && (typeof user.follower_count !== 'number' || user.follower_count < Number(filters.followersMin))) return false;
  if (filters.followersMax && (typeof user.follower_count !== 'number' || user.follower_count > Number(filters.followersMax))) return false;
  if (filters.followingsMin && (typeof user.following_count !== 'number' || user.following_count < Number(filters.followingsMin))) return false;
  if (filters.followingsMax && (typeof user.following_count !== 'number' || user.following_count > Number(filters.followingsMax))) return false;
  return true;
}
