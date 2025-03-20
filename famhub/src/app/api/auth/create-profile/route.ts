import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const cookieStore = cookies();
    
    // Initialize Supabase client with service role
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    }, {
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
    });

    // Insert the user profile
    const { error } = await supabase
      .from('users')
      .insert([
        {
          id: requestData.id,
          first_name: requestData.first_name,
          last_name: requestData.last_name,
          email: requestData.email,
          role: requestData.role,
          persona: requestData.persona,
          status: requestData.status
        }
      ]);

    if (error) {
      console.error('Error creating user profile:', error);
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
