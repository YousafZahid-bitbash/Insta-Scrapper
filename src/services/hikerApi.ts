import axios from "axios";

const HIKER_API_URL = process.env.HIKER_API_URL || "https://api.hikerapi.com";
const HIKER_API_KEY = process.env.HIKER_API_KEY;

if (!HIKER_API_KEY) {
  throw new Error("HIKER_API_KEY is not set in environment variables");
}

const hikerClient = axios.create({
  baseURL: HIKER_API_URL,
  headers: {
    "x-access-key": HIKER_API_KEY,
    "Content-Type": "application/json",
  },
});

// Get a user's followers (one page) with cursor
export async function userFollowersChunkGql(user_id: string, force?: any, end_cursor?: any) {
  try {
    const params: any = { user_id };
    if (force !== undefined) params.force = force;
    if (end_cursor !== undefined) params.end_cursor = end_cursor;
    const res = await hikerClient.get("/gql/user/followers/chunk", { params });
    return res.data;
  } catch (error: any) {
    handleHikerError(error);
  }
}

// Get a user's followings (one page) with cursor
export async function userFollowingChunkGql(user_id: string, force?: any, end_cursor?: any) {
  try {
    const params: any = { user_id };
    if (force !== undefined) params.force = force;
    if (end_cursor !== undefined) params.end_cursor = end_cursor;
    const res = await hikerClient.get("/gql/user/following/chunk", { params });
    return res.data;
  } catch (error: any) {
    handleHikerError(error);
  }
}

// Get media likers
export async function mediaLikersV1(id: string) {
  try {
    const params = { id };
    const res = await hikerClient.get("/v1/media/likers", { params });
    return res.data;
  } catch (error: any) {
    handleHikerError(error);
  }
}

// Get media comments (commenters)
export async function mediaCommentsV2(id: string, can_support_threading?: any, page_id?: any) {
  try {
    const params: any = { id };
    if (can_support_threading !== undefined) params.can_support_threading = can_support_threading;
    if (page_id !== undefined) params.page_id = page_id;
    const res = await hikerClient.get("/v2/media/comments", { params });
    return res.data;
  } catch (error: any) {
    handleHikerError(error);
  }
}

// Example for posts (media):
export async function userMediaChunkGql(user_id: string, end_cursor?: any) {
  try {
    const params: any = { user_id };
    if (end_cursor !== undefined) params.end_cursor = end_cursor;
    const res = await hikerClient.get("/gql/user/media/chunk", { params });
    return res.data;
  } catch (error: any) {
    handleHikerError(error);
  }
}

function handleHikerError(error: any) {
  if (error.response) {
    if (error.response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    throw new Error(error.response.data?.message || "Hiker API error");
  }
  throw new Error(error.message || "Unknown Hiker API error");
}
