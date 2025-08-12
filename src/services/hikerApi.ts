

import { HikerUser } from "../utils/types";
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



// Get user object by username (returns user info, including pk as user_id)
export async function userByUsernameV1(username: string): Promise<HikerUser | undefined> {
  try {
    const params = { username };
    const res = await hikerClient.get("/v1/user/by/username", { params });
    return res.data;
  } catch (error: unknown) {
    handleHikerError(error);
  }
}

// Get a user's followers (one page) with cursor
// Get a user's followers by username (fetches user_id first)
export async function userFollowersChunkGqlByUsername(username: string, force?: boolean, end_cursor?: string) {
  const user = await userByUsernameV1(username);
  if (!user || !user.pk) throw new Error("User not found");
  return userFollowersChunkGql(user.pk, force, end_cursor);
}

// Original function (still available if you already have user_id)
export async function userFollowersChunkGql(user_id: string, force?: boolean, end_cursor?: string) {
  try {
    const params: Record<string, unknown> = { user_id };
    if (force !== undefined) params.force = force;
    if (end_cursor !== undefined) params.end_cursor = end_cursor;
    const res = await hikerClient.get("/gql/user/followers/chunk", { params });
    return res.data;
  } catch (error: unknown) {
    handleHikerError(error);
  }
}

// Get a user's followings (one page) with cursor
// Get a user's followings by username (fetches user_id first)
export async function userFollowingChunkGqlByUsername(username: string, force?: boolean, end_cursor?: string) {
  const user = await userByUsernameV1(username);
  if (!user || !user.pk) throw new Error("User not found");
  return userFollowingChunkGql(user.pk, force, end_cursor);
}

// Original function (still available if you already have user_id)
export async function userFollowingChunkGql(user_id: string, force?: boolean, end_cursor?: string) {
  try {
    const params: Record<string, unknown> = { user_id };
    if (force !== undefined) params.force = force;
    if (end_cursor !== undefined) params.end_cursor = end_cursor;
    const res = await hikerClient.get("/gql/user/following/chunk", { params });
    return res.data;
  } catch (error: unknown) {
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
