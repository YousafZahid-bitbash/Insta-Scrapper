import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../supabaseClient';

// Map extraction_type to table name
const extractionTypeToTable: Record<string, string> = {
  followers: 'extracted_users',
  followings: 'extracted_users',
  likers: 'extracted_users',
  users: 'extracted_users',
  posts: 'extracted_posts',
  commenters: 'extracted_commenters',
  hashtags: 'extracted_hashtag_posts',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get('user_id');
  if (!user_id) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
  }

  // Fetch all extractions for the user
  const { data: extractions, error } = await supabase
    .from('extractions')
    .select('*')
    .eq('user_id', user_id)
    .order('requested_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // For each extraction, fetch its data from the appropriate table
  const results = await Promise.all(
    (extractions || []).map(async (extraction) => {
      const table = extractionTypeToTable[extraction.extraction_type] || 'extracted_users';
      const { data: extractionData, error: dataError } = await supabase
        .from(table)
        .select('*')
        .eq('extraction_id', extraction.id);
      return {
        ...extraction,
        data: extractionData || [],
        dataError: dataError ? dataError.message : null,
      };
    })
  );

  return NextResponse.json(results);
}
