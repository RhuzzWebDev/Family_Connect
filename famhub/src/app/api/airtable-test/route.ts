import { NextResponse } from 'next/server';
import { base } from '@/lib/airtable';

export async function GET() {
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
      records: records.map(record => ({
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
