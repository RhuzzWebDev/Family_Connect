import { NextResponse } from 'next/server';
import { base, hasAirtableConfig } from '@/lib/airtable';
import bcrypt from 'bcryptjs';
import { UserFields, UserRole, UserPersona } from '@/services/airtableService';
import { Record, FieldSet } from 'airtable';

// Define a type for Airtable records
interface AirtableRecord extends Record<FieldSet> {
  fields: UserFields;
}

const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const createTestUsers = async () => {
  const password = await hashPassword('Test123!');
  
  const testUsers = [
    {
      fields: {
        first_name: "John",
        last_name: "Smith",
        Email: "john.smith@family.com",
        role: "Father" as UserRole,
        persona: "Parent" as UserPersona,
        Status: "Active",
        Password: password,
        Confirm_Password: password
      }
    },
    {
      fields: {
        first_name: "Mary",
        last_name: "Smith",
        Email: "mary.smith@family.com",
        role: "Mother" as UserRole,
        persona: "Parent" as UserPersona,
        Status: "Active",
        Password: password,
        Confirm_Password: password
      }
    },
    {
      fields: {
        first_name: "James",
        last_name: "Smith",
        Email: "james.smith@family.com",
        role: "Older Brother" as UserRole,
        persona: "Children" as UserPersona,
        Status: "Active",
        Password: password,
        Confirm_Password: password
      }
    }
  ];

  return testUsers;
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

    // Log base availability
    console.log('Base available:', Boolean(base));

    // Create test users
    const testUsers = await createTestUsers();
    console.log('Test users created:', testUsers.length);

    // Try to create records
    console.log('Attempting to create records in User table...');
    const records = await base('User').create(testUsers);
    console.log('Records created successfully:', records.length);

    return NextResponse.json({
      success: true,
      message: 'Test users created successfully',
      records: records.map((record: Record<FieldSet>) => ({
        id: record.id,
        fields: record.fields as UserFields
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
      error: error.message || 'Failed to create test users',
      details: error.error || error
    }, { status: 500 });
  }
}
