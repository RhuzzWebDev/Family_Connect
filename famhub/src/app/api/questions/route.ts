import { NextResponse } from 'next/server';
import { base, hasAirtableConfig } from '@/lib/airtable';
import { QuestionFields } from '@/services/airtableService';

export async function GET() {
  try {
    if (!hasAirtableConfig || !base) {
      return NextResponse.json({
        success: false,
        message: 'Airtable is not configured'
      }, { status: 503 });
    }

    const records = await base('Questions_user')
      .select({
        sort: [{ field: 'Timestamp', direction: 'desc' }]
      })
      .all();

    return NextResponse.json({
      success: true,
      questions: records.map(record => ({
        id: record.id,
        ...record.fields
      }))
    });

  } catch (error: any) {
    console.error('Failed to fetch questions:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to fetch questions'
    }, { status: 500 });
  }
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
    const fields: QuestionFields = {
      user_id: data.user_id,
      questions: data.question, // Map question to questions field
      file_url: data.file_url,
      mediaType: data.mediaType,
      folder_path: data.folder_path,
      like_count: 0,
      comment_count: 0,
      Timestamp: new Date().toISOString()
    };

    const records = await base('Questions_user').create([{ fields }]);

    return NextResponse.json({
      success: true,
      question: {
        id: records[0].id,
        ...records[0].fields
      }
    });

  } catch (error: any) {
    console.error('Failed to create question:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to create question'
    }, { status: 500 });
  }
}
