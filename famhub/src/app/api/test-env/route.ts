import { NextResponse } from 'next/server';

export async function GET() {
  // This route is just for testing - remove it in production
  return NextResponse.json({
    hasAirtableKey: !!process.env.AIRTABLE_API_KEY,
    hasBaseId: !!process.env.AIRTABLE_BASE_ID,
    hasTableName: !!process.env.AIRTABLE_TABLE_NAME,
  });
}
