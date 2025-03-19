import { NextResponse } from 'next/server';
import { base, hasAirtableConfig } from '@/lib/airtable';
import { QuestionFields } from '@/services/airtableService';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!hasAirtableConfig || !base) {
      return NextResponse.json({
        success: false,
        message: 'Airtable is not configured'
      }, { status: 503 });
    }

    const questionId = params.id;
    const record = await base('Questions_user').find(questionId);
    const currentLikes = (record.fields as QuestionFields).like_count || 0;

    // Increment like count
    const updatedRecord = await base('Questions_user').update(questionId, {
      like_count: currentLikes + 1
    });

    return NextResponse.json({
      success: true,
      record: {
        id: updatedRecord.id,
        fields: updatedRecord.fields
      }
    });

  } catch (error: any) {
    console.error('Failed to like question:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to like question'
    }, { status: 500 });
  }
}
