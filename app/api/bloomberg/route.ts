import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker');

  if (ticker) {
    const [data] = await sql`
      SELECT * FROM bloomberg_data WHERE ticker = ${ticker}
    `;
    return NextResponse.json(data || null);
  }

  const data = await sql`
    SELECT * FROM bloomberg_data ORDER BY ticker ASC
  `;
  return NextResponse.json(data);
}
