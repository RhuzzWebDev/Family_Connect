import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const questionId = params.id;

    // Get current like count
    const { data: currentQuestion, error: fetchError } = await supabase
      .from('questions')
      .select('like_count')
      .eq('id', questionId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    const newLikeCount = (currentQuestion?.like_count || 0) + 1;

    // Update like count
    const { data, error: updateError } = await supabase
      .from('questions')
      .update({ like_count: newLikeCount })
      .eq('id', questionId)
      .select(`
        *,
        user:users (
          first_name,
          last_name
        )
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      record: data
    });

  } catch (error: any) {
    console.error('Failed to like question:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to like question'
    }, { status: 500 });
  }
}
