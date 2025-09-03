import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const environmentInfo = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_JWT_SECRET: process.env.NEXT_PUBLIC_JWT_SECRET ? 'SET' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
    SUPABASE_URL_VALUE: process.env.NEXT_PUBLIC_SUPABASE_URL,
    JWT_SECRET_LENGTH: process.env.NEXT_PUBLIC_JWT_SECRET?.length || 0,
    timestamp: new Date().toISOString()
  };

  console.log('🔧 [Environment Check]:', environmentInfo);

  return NextResponse.json({
    message: 'Environment check',
    ...environmentInfo
  });
}
