
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

// Get a user's followers (one page) with cursor
// Get a user's followers by username (fetches user_id first)
export async function userFollowersChunkGqlByUsername(username: string, force?: boolean, end_cursor?: string) {
  console.log(`[hikerApi] userFollowersChunkGqlByUsername called with username:`, username, 'force:', force, 'end_cursor:', end_cursor);
  const user = await userByUsernameV1(username);
  console.log(`[hikerApi] userByUsernameV1 result:`, user);
  if (!user || !user.pk) {
    console.error(`[hikerApi] User not found for username:`, username);
    throw new Error("User not found");
  }
  // Pass username to main function for DB save
  return userFollowersChunkGql(user.pk, force, end_cursor, username);
}

// Original function (still available if you already have user_id)
export async function userFollowersChunkGql(user_id: string, force?: boolean, end_cursor?: string, target_username?: string) {
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
    let nextPageId: string | undefined = undefined;
    let pageCount = 0;
    
    const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
    do {
        const params: Record<string, unknown> = { user_id };
        if (nextPageId) params.page_id = nextPageId;
        console.log(`[hikerApi] [FollowersV2] Calling /v2/user/followers with params:`, params);
        const res = await hikerClient.get("/v2/user/followers", { params });
        console.log(`[hikerApi] [FollowersV2] API response:`, res.data);
        // Response structure: { response: { users: [...] }, next_page_id: "..." }
        const data = res.data;
        const users = data && data.response && Array.isArray(data.response.users) ? data.response.users : [];
        console.log(`[hikerApi] [FollowersV2] Extracted users count:`, users.length);
        if (users.length === 0) {
          console.warn(`[hikerApi] [FollowersV2] Empty or invalid response, skipping coin deduction and DB save for this page.`);
        } else {
          allFollowers = allFollowers.concat(users);
          pageCount++;
        }
        nextPageId = typeof data.next_page_id === 'string' && data.next_page_id ? data.next_page_id : undefined;
        console.log(`[hikerApi] [FollowersV2] Next page id:`, nextPageId);
      } while (nextPageId);

    console.log(`[hikerApi] [FollowersV2] Total followers collected:`, allFollowers.length);
    // Save extraction and extracted users to DB only if followers found
    if (userId && allFollowers.length > 0) {
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
          const extractedUsers = allFollowers.map((u: Follower) => ({
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
              const newCoins = Math.max(0, userData.coins - allFollowers.length);
              const { error: updateError } = await supabase
                .from("users")
                .update({ coins: newCoins })
                .eq("id", userId);
              if (updateError) {
                console.error(`[hikerApi] Error updating coins:`, updateError);
              } else {
                console.log(`[hikerApi] Coins updated. Deducted:`, allFollowers.length, `New balance:`, newCoins);
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
      console.warn(`[hikerApi] [FollowersV2] No followers found, skipping DB save and coin deduction.`);
    }
    return allFollowers;
  } catch (error: unknown) {
    console.error('[hikerApi] userFollowersChunkGqlV2 actual error:', error);
    handleHikerError(error);
  }
}

// Get a user's followings (one page) with cursor
// Get a user's followings by username (fetches user_id first)
export async function userFollowingChunkGqlByUsername(username: string, force?: boolean, end_cursor?: string) {
  
  const user = await userByUsernameV1(username);
  console.log(`[hikerApi] userByUsernameV1 result:`, user);
  if (!user || !user.pk) throw new Error("User not found");
  return userFollowingChunkGql(user.pk, force, end_cursor, username);
}

// Original function (still available if you already have user_id)
export async function userFollowingChunkGql(user_id: string, force?: boolean, end_cursor?: string, target_username?: string) {
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
      const params: Record<string, unknown> = { user_id };
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


// Get media likers
export async function mediaLikersV1(id: string) {
  try {
    const params: Record<string, unknown> = { id };
    const res = await hikerClient.get("/v1/media/likers", { params });
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
