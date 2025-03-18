import { NextResponse } from 'next/server';
import { base, hasAirtableConfig } from '@/lib/airtable';
import { QuestionFields } from '@/services/airtableService';
import { Record, FieldSet, Base } from 'airtable';

// Sample image and video URLs (assuming these are publicly accessible)
const sampleMediaUrls = {
  image: 'https://picsum.photos/800/600', // Random placeholder image
  video: 'https://www.example.com/sample-video.mp4',
  audio: 'https://www.example.com/sample-audio.mp3'
};

interface AirtableRecord extends Record<FieldSet> {
  fields: QuestionFields;
}

const createTestQuestions = async (base: Base) => {
  // Get our test users first
  const users = await base('User')
    .select({
      filterByFormula: "OR(Email = 'john.smith@family.com', Email = 'mary.smith@family.com', Email = 'james.smith@family.com')"
    })
    .all();

  const testQuestions = [];
  const currentTime = new Date().toISOString();

  // Create questions for John (Father)
  const john = users.find(user => user.fields.Email === 'john.smith@family.com');
  if (john) {
    testQuestions.push({
      fields: {
        user_id: john.id,
        question: "What's everyone's plan for the weekend? I was thinking we could go camping!",
        like_count: 0,
        comment_count: 0,
        Timestamp: currentTime
      }
    });

    testQuestions.push({
      fields: {
        user_id: john.id,
        question: "Check out this beautiful sunset from our backyard!",
        file_url: sampleMediaUrls.image,
        like_count: 0,
        comment_count: 0,
        Timestamp: currentTime
      }
    });
  }

  // Create questions for Mary (Mother)
  const mary = users.find(user => user.fields.Email === 'mary.smith@family.com');
  if (mary) {
    testQuestions.push({
      fields: {
        user_id: mary.id,
        question: "I made your favorite lasagna for dinner! Come home early!",
        file_url: sampleMediaUrls.image,
        like_count: 0,
        comment_count: 0,
        Timestamp: currentTime
      }
    });

    testQuestions.push({
      fields: {
        user_id: mary.id,
        question: "Listen to James playing piano! He's getting better every day.",
        file_url: sampleMediaUrls.audio,
        like_count: 0,
        comment_count: 0,
        Timestamp: currentTime
      }
    });
  }

  // Create questions for James (Older Brother)
  const james = users.find(user => user.fields.Email === 'james.smith@family.com');
  if (james) {
    testQuestions.push({
      fields: {
        user_id: james.id,
        question: "Got an A+ on my math test! ",
        like_count: 0,
        comment_count: 0,
        Timestamp: currentTime
      }
    });

    testQuestions.push({
      fields: {
        user_id: james.id,
        question: "Check out my basketball game highlights!",
        file_url: sampleMediaUrls.video,
        like_count: 0,
        comment_count: 0,
        Timestamp: currentTime
      }
    });
  }

  return testQuestions;
};

export async function GET() {
  try {
    // Log environment variables and configuration
    console.log('Environment Check:');
    console.log('API Key exists:', Boolean(process.env.NEXT_PUBLIC_AIRTABLE_API_KEY));
    console.log('Base ID exists:', Boolean(process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID));
    console.log('Has Airtable Config:', hasAirtableConfig);

    // If Airtable is not configured, return a message
    if (!hasAirtableConfig || !base) {
      return NextResponse.json({
        success: false,
        message: 'Airtable is not configured. Please add AIRTABLE_API_KEY and AIRTABLE_BASE_ID to your environment variables.'
      }, { status: 503 });
    }

    // Create test questions
    const testQuestions = await createTestQuestions(base);
    console.log('Test questions created:', testQuestions.length);

    // Try to create records
    console.log('Attempting to create records in Questions_user table...');
    const records = await base('Questions_user').create(testQuestions);
    console.log('Records created successfully:', records.length);

    return NextResponse.json({
      success: true,
      message: 'Test questions created successfully',
      records: records.map((record: Record<FieldSet>) => ({
        id: record.id,
        fields: record.fields as QuestionFields
      }))
    });
  } catch (error: any) {
    console.error('Detailed error:', {
      message: error.message,
      error: error,
      stack: error.stack
    });

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create test questions',
      details: error.error || error
    }, { status: 500 });
  }
}
