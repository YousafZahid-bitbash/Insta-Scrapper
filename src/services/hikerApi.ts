
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
/**
 * Accepts frontend payload: { target: string | string[], filters: FilterOptions }
 * Resolves user_id(s), fetches followers, filters, and saves to DB.
 */
export async function userFollowersChunkGqlByUsername(payload: { target: string | string[], filters: FilterOptions, force?: boolean, end_cursor?: string }) {
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
  return userFollowersChunkGql(userIds, force, end_cursor, usernames.join(","), filtersRecord);
}

// Original function (still available if you already have user_id)
export async function userFollowersChunkGql(user_id: string | string[], force?: boolean, end_cursor?: string, target_username?: string | string[], filters?: Record<string, FilterOptions>) {
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
    let pageCount = 0;
    const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
    const userIds = Array.isArray(user_id) ? user_id : [user_id];
    
    const errorMessages: string[] = [];
    const validUserIds: string[] = [...userIds];
    for (let i = 0; i < validUserIds.length; i++) {
      const singleUserId = validUserIds[i];
      let nextPageId: string | undefined = undefined;
      try {
        do {
          const params: Record<string, unknown> = { user_id: singleUserId };
          if (nextPageId) params.page_id = nextPageId;
          const res = await hikerClient.get("/v2/user/followers", { params });
          const data = res.data;
          const users = data && data.response && Array.isArray(data.response.users) ? data.response.users : [];
          if (users.length === 0) {
            console.warn(`[hikerApi] [FollowersV2] Empty or invalid response for user_id ${singleUserId}, skipping coin deduction and DB save for this page.`);
          } else {
            allFollowers = allFollowers.concat(users);
            pageCount++;
          }
          nextPageId = typeof data.next_page_id === 'string' && data.next_page_id ? data.next_page_id : undefined;
          console.log(`[hikerApi] [FollowersV2] Next page id for user_id ${singleUserId}:`, nextPageId);
        } while (nextPageId);
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
    }
  const safeFilters = filters || {};
  // Pick the correct filter options object (followers)
  const filterOptions = safeFilters.followers || {};
  console.log('[Backend] [userFollowersChunkGql] Filters received:', filterOptions);
  console.log('[Backend] Starting filtering process. Total users before filtering:', allFollowers.length);
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
export async function userFollowingChunkGqlByUsername(payload: { target: string | string[], filters: FilterOptions, force?: boolean, end_cursor?: string }) {
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
  return userFollowingChunkGql(userIds, force, end_cursor, usernames.join(","), filtersRecord);
}

// Original function (still available if you already have user_id)
export async function userFollowingChunkGql(user_id: string | string[], force?: boolean, end_cursor?: string, target_username?: string, filters?: Record<string, FilterOptions>) {
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
    let pageCount = 0;
    const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
    const userIds = Array.isArray(user_id) ? user_id : [user_id];
    for (const singleUserId of userIds) {
      let nextPageId: string | undefined = undefined;
      try {
        do {
          const params: Record<string, unknown> = { user_id: singleUserId };
          if (nextPageId) params.page_id = nextPageId;
          const res = await hikerClient.get("/v2/user/following", { params });
          const data = res.data;
          const users = data && data.response && Array.isArray(data.response.users) ? data.response.users : [];
          if (users.length === 0) {
            console.warn(`[hikerApi] [FollowingV2] Empty or invalid response for user_id ${singleUserId}, skipping coin deduction and DB save for this page.`);
          } else {
            allFollowings = allFollowings.concat(users);
            pageCount++;
          }
          nextPageId = typeof data.next_page_id === 'string' && data.next_page_id ? data.next_page_id : undefined;
          console.log(`[hikerApi] [FollowingV2] Next page id for user_id ${singleUserId}:`, nextPageId);
        } while (nextPageId);
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
    }
  const safeFilters = filters || {};
  // Pick the correct filter options object (following)
  const filterOptions = safeFilters.following || {};
  console.log('[Backend] [userFollowingChunkGql] Filters received:', filterOptions);
  console.log('[Backend] Starting filtering process. Total users before filtering:', allFollowings.length);
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
      email: safeFilters.extractEmail ? user.email ?? null : null,
      phone: safeFilters.extractPhone ? user.phone ?? null : null,
      link_in_bio: safeFilters.extractLinkInBio ? user.link_in_bio ?? null : null,
      is_business: typeof user.is_business !== 'undefined' ? user.is_business : null,
      // extraction_id will be added before DB insert
    }));
    console.log('[Backend] Filtering complete. Total users after filtering:', filteredFollowings.length);
    console.log('[Backend] Filters used:', safeFilters);
    console.log(`[hikerApi] [FollowingV2] Total followings collected:`, allFollowings.length);
    // Save extraction and extracted users to DB only if followings found
    if (userId && filteredFollowings.length > 0) {
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
  filterByNameInBioStop?: string;
  filterByName?: string;
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
