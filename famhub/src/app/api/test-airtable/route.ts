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
    const records: AirtableRecord[] = await base('User')
      .select({
        maxRecords: 1,
        view: 'Grid view'
      })
      .all();

    return NextResponse.json({
      success: true,
      connectionTest: 'Airtable connection successful!',
      recordCount: records.length,
      sampleRecord: records.length > 0 ? {
        id: records[0].id,
        fields: records[0].fields
      } : null
    });
  } catch (error: any) {
    console.error('Airtable Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to connect to Airtable',
      details: error.error || error
    }, { status: 500 });
  }
}
