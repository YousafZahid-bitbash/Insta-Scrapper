import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (replace with your env vars or config)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, extraction_type, target_username, target_user_id } = body;
    if (!user_id || !extraction_type || !target_username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('extractions')
      .insert([
        {
          user_id,
          extraction_type,
          target_username,
          target_user_id: target_user_id || null,
          status: 'pending',
          progress: 0,
          requested_at: new Date().toISOString(),
        },
      ])
      .select('id, status, progress')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ extraction: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
