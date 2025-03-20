'use client';
import { useState, useEffect } from 'react';
import { QuestionWithUser } from '@/lib/supabase';
import { SupabaseService } from '@/services/supabaseService';
import { Card } from '@/components/ui/card';
import { QuestionCard } from '@/components/question/QuestionCard';
import { supabase } from '@/lib/supabase';

export function QuestionDashboard() {
  const [questions, setQuestions] = useState<QuestionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = async () => {
    try {
      const data = await SupabaseService.getQuestions();
      setQuestions(data);
      setError(null);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();

    // Set up real-time subscription for questions
    const channel = supabase
      .channel('questions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions'
        },
        async () => {
          // Refetch questions when any change occurs
          await fetchQuestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-red-500">Error: {error}</p>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">No questions yet. Be the first to ask!</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {questions.map((question) => (
        <QuestionCard key={question.id} question={question} />
      ))}
    </div>
  );
}
