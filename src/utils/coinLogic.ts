import { SupabaseClient } from "@supabase/supabase-js";
// Centralized coin deduction logic for all extraction types

export const COIN_RULES = {
  followers: {
    perChunk: { users: 10, coins: 1 }, // 1 coin per 10 users
    perUser: 1, // 1 coin per userByUsername
  },
  following: {
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
  console.log(`[coinLogic] Attempting to deduct ${amount} coins from user ${userId}`);
  
  // Ensure amount is integer to avoid decimal coin deductions
  const roundedAmount = Math.ceil(amount); // Round up to ensure we don't undercharge
  console.log(`[coinLogic] Rounded amount from ${amount} to ${roundedAmount}`);
  
  const { data: userData, error: coinsError } = await supabase
    .from("users")
    .select("coins")
    .eq("id", userId)
    .single();
  if (coinsError || !userData || typeof userData.coins !== "number") {
    console.error(`[coinLogic] Error fetching user coins:`, coinsError);
    throw new Error("Could not fetch user coins");
  }
  
  console.log(`[coinLogic] Current coins: ${userData.coins}, deducting: ${roundedAmount}`);
  const newCoins = Math.max(0, Math.floor(userData.coins - roundedAmount)); // Ensure integer
  console.log(`[coinLogic] New coins balance will be: ${newCoins}`);
  
  // Use RPC function to update coins (bypasses RLS issues)
  console.log(`[coinLogic] Using RPC method to update coins...`);
  const { data: updateResult, error: rpcError } = await supabase.rpc('update_user_coins', {
    user_id: userId,
    new_coin_count: Math.floor(newCoins) // Ensure integer value
  });
  
  if (rpcError || !updateResult) {
    console.error(`[coinLogic] RPC update failed:`, rpcError);
    throw new Error(`Could not update user coins: ${rpcError?.message || 'Unknown error'}`);
  }
  
  console.log(`[coinLogic] RPC update succeeded`);
  return newCoins;
  
    // setCoins(newCoins); // This will update the Navbar if it uses the coins state
  // Return new balance for frontend
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
