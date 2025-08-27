import { SupabaseClient } from "@supabase/supabase-js";
// Centralized coin deduction logic for all extraction types

export const COIN_RULES = {
  followers: {
    perChunk: { users: 10, coins: 1 }, // 1 coin per 10 users
    perUser: 1, // 1 coin per userByUsername
  },
  followings: {
    perChunk: { users: 10, coins: 1 },
    perUser: 1,
  },
  likers: {
    perChunk: { users: 10, coins: 1 },
    perUser: 1,
  },
  posts: {
    perPost: 2, // 2 coins per post
  },
  commenters: {
    perChunk: { users: 2, coins: 1 }, // 1 coin per 2 users
    perTwoUsers: 1,
  },
  hashtags: {
    perData: 2, // 2 coins per data
  },
};

export async function deductCoins(userId: string, amount: number, supabase: SupabaseClient): Promise<number> {
  // Deduct coins from user, return new balance
  const { data: userData, error: coinsError } = await supabase
    .from("users")
    .select("coins")
    .eq("id", userId)
    .single();
  if (coinsError || !userData || typeof userData.coins !== "number") {
    throw new Error("Could not fetch user coins");
  }
  const newCoins = Math.max(0, userData.coins - amount);
  const { error: updateError } = await supabase
    .from("users")
    .update({ coins: newCoins })
    .eq("id", userId);
  if (updateError) {
    throw new Error("Could not update user coins");
  }
  return newCoins;
}

export async function getUserCoins(userId: string, supabase: SupabaseClient): Promise<number> {
  const { data: userData, error: coinsError } = await supabase
    .from("users")
    .select("coins")
    .eq("id", userId)
    .single();
  if (coinsError || !userData || typeof userData.coins !== "number") {
    throw new Error("Could not fetch user coins");
  }
  return userData.coins;
}
