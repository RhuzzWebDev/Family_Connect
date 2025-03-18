import { NextResponse } from 'next/server';
import { base, hasAirtableConfig } from '@/lib/airtable';
import { Record, FieldSet, Records } from 'airtable';

interface MemoryFields extends FieldSet {
  title: string;
  content: string;
  user_id: string;
  Timestamp: string;
  file_url?: string;
}

export async function POST(request: Request) {
  try {
    if (!hasAirtableConfig || !base) {
      return NextResponse.json({
        success: false,
        message: 'Airtable is not configured'
      }, { status: 503 });
    }

    const data = await request.json();
    const { title, content, user_id, file_url } = data;

    // Validate required fields
    if (!title || !content || !user_id) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 });
    }

    // Create memory record
    const record = await base('Memories').create([{
      fields: {
        title,
        content,
        user_id,
        file_url,
        Timestamp: new Date().toISOString()
      } as MemoryFields
    }]);

    return NextResponse.json({
      success: true,
      record: {
        id: record[0].id,
        fields: record[0].fields as MemoryFields
      }
    });

  } catch (error: any) {
    console.error('Error creating memory:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create memory'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!hasAirtableConfig || !base) {
      return NextResponse.json({
        success: false,
        message: 'Airtable is not configured'
      }, { status: 503 });
    }

    // Fetch all memories, sorted by timestamp
    const records = await base('Memories')
      .select({
        sort: [{ field: 'Timestamp', direction: 'desc' }]
      })
      .all();

    // Safely convert and validate the records
    const memories = records.map(record => {
      const fields = record.fields as unknown as MemoryFields;
      // Validate required fields
      if (!fields.title || !fields.content || !fields.user_id || !fields.Timestamp) {
        console.warn('Memory record missing required fields:', record.id);
        return null;
      }
      return {
        id: record.id,
        fields
      };
    }).filter((memory): memory is { id: string; fields: MemoryFields } => memory !== null);

    return NextResponse.json({
      success: true,
      records: memories
    });

  } catch (error: any) {
    console.error('Error fetching memories:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch memories'
    }, { status: 500 });
  }
}
