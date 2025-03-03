import { NextResponse } from 'next/server';
import { base } from '@/lib/airtable';

export async function GET() {
  try {
    const records = await base('User')
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
