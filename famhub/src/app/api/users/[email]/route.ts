import { NextResponse } from 'next/server';
import { base, hasAirtableConfig } from '@/lib/airtable';

export async function GET(
  request: Request,
  { params }: { params: { email: string } }
) {
  try {
    if (!hasAirtableConfig || !base) {
      return NextResponse.json({
        success: false,
        message: 'Airtable is not configured'
      }, { status: 503 });
    }

    const userEmail = params.email;
    
    // Find user by email
    const records = await base('Users').select({
      filterByFormula: `{Email} = '${userEmail}'`,
      maxRecords: 1
    }).all();

    if (records.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    const user = records[0];
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.fields.Email,
        first_name: user.fields.first_name,
        last_name: user.fields.last_name,
        role: user.fields.role,
        persona: user.fields.persona
      }
    });

  } catch (error: any) {
    console.error('Failed to fetch user:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to fetch user'
    }, { status: 500 });
  }
}
