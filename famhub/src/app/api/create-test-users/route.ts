import { NextResponse } from 'next/server';
import { base } from '@/lib/airtable';

const testUsers = [
  {
    fields: {
      Name: "John Smith",
      Email: "john.smith@family.com",
      Role: ["Admin"],
      Status: "Active",
      Password: "Admin123!",
      Confirm_Password: "Admin123!"
    }
  },
  {
    fields: {
      Name: "Sarah Johnson",
      Email: "sarah.j@family.com",
      Role: ["User"],
      Status: "Validating",
      Password: "Member123!",
      Confirm_Password: "Member123!"
    }
  },
  {
    fields: {
      Name: "Mike Wilson",
      Email: "mike.w@family.com",
      Role: ["User"],
      Status: "Not Active",
      Password: "Family123!",
      Confirm_Password: "Family123!"
    }
  }
];

export async function GET() {
  try {
    const records = await base('User').create(testUsers);

    return NextResponse.json({
      success: true,
      message: 'Test users created successfully',
      records: records.map(record => ({
        id: record.id,
        fields: record.fields
      }))
    });
  } catch (error: any) {
    console.error('Airtable Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create test users',
      details: error.error || error
    }, { status: 500 });
  }
}
