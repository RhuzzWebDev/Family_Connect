import { NextResponse } from 'next/server';
import { base } from '@/lib/airtable';

export async function GET() {
  try {
    const records = await base('User')
      .select({
        maxRecords: 10,
        view: 'Grid view'
      })
      .all();

    return NextResponse.json({
      success: true,
      users: records.map(record => ({
        id: record.id,
        fields: record.fields
      }))
    });
  } catch (error: any) {
    console.error('Airtable Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch users',
      details: error.error || error
    }, { status: 500 });
  }
}
