import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password === 'fingerthumb') {
    const response = NextResponse.json({ success: true });
    // Set a real HTTP cookie so API routes can auth browser requests
    // httpOnly: false so Next.js middleware can still read it if needed
    response.cookies.set('kabuten-auth', 'true', {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      // Session cookie — expires when browser closes (no maxAge)
    });
    return response;
  }
  return NextResponse.json({ success: false }, { status: 401 });
}
