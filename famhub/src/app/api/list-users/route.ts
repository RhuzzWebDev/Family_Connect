import { NextResponse } from 'next/server';
import { base, hasAirtableConfig } from '@/lib/airtable';

// Define a type for Airtable records
interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
}

export async function GET() {
  // If Airtable is not configured, return a message
  if (!hasAirtableConfig) {
    return NextResponse.json({
      success: false,
      message: 'Airtable is not configured. Please add AIRTABLE_API_KEY and AIRTABLE_BASE_ID to your environment variables.'
    }, { status: 503 });
  }

  try {
    const records = await base('User')
      .select({
        maxRecords: 10,
        view: 'Grid view'
      })
      .all();

    return NextResponse.json({
      success: true,
      users: records.map((record: AirtableRecord) => ({
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
