import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { email: string } }
) {
  try {
    const userEmail = params.email;
    
    // Find user by email using Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, persona')
      .eq('email', userEmail)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found error code
        return NextResponse.json({
          success: false,
          message: 'User not found'
        }, { status: 404 });
      }
      
      throw error;
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        persona: user.persona
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
