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
    // Replace 'YOUR_TABLE_NAME' with your actual table name from .env
    const tableName = process.env.AIRTABLE_TABLE_NAME || 'YOUR_TABLE_NAME';
    
    const records = await base(tableName)
      .select({
        maxRecords: 3,
        view: 'Grid view'
      })
      .all();

    return NextResponse.json({
      success: true,
      records: records.map((record: AirtableRecord) => ({
        id: record.id,
        fields: record.fields
      }))
    });
  } catch (error) {
    console.error('Airtable Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch records'
    }, { status: 500 });
  }
}
