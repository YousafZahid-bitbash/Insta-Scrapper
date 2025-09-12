import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing extraction id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('extractions')
    .select('id, status, progress, error_message, completed_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Extraction not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    status: data.status,
    progress: data.progress,
    error_message: data.error_message,
    completed_at: data.completed_at,
  });
}
