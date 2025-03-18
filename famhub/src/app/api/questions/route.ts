import { NextResponse } from 'next/server';
import { base, hasAirtableConfig } from '@/lib/airtable';
import { QuestionFields } from '@/services/airtableService';
import { Record, FieldSet } from 'airtable';

export async function GET() {
  try {
    // Check Airtable configuration
    if (!hasAirtableConfig || !base) {
      return NextResponse.json({
        success: false,
        message: 'Airtable is not configured'
      }, { status: 503 });
    }

    // Fetch all questions from Questions_user table
    const records = await base('Questions_user')
      .select({
        sort: [{ field: 'Timestamp', direction: 'desc' }]
      })
      .all();

    // Map records to our interface
    const questions = records.map((record: Record<FieldSet>) => ({
      id: record.id,
      fields: record.fields as QuestionFields
    }));

    return NextResponse.json({
      success: true,
      records: questions
    });

  } catch (error: any) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch questions'
    }, { status: 500 });
  }
}
