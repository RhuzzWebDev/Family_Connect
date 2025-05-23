'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import QuestionGridBase, { Question, QuestionSet } from './QuestionGridBase';
import { toggleQuestionLike } from '@/lib/server/actions';

interface QuestionGridClientProps {
  initialQuestions: Question[];
  initialQuestionSets: QuestionSet[];
  showHeader?: boolean;
  limitCards?: number;
}

export default function QuestionGridClient({ 
  initialQuestions, 
  initialQuestionSets,
  showHeader = true,
  limitCards 
}: QuestionGridClientProps) {
  // Use server-provided data as initial state
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>(initialQuestionSets);
  const [isLiking, setIsLiking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Set up real-time subscription for new questions
  useEffect(() => {
    const channel = supabase
      .channel('questions-channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'questions' 
      }, (payload) => {
        // Fetch the complete question with user info
        fetchNewQuestion(payload.new.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch a single new question with all related data
  const fetchNewQuestion = async (questionId: string) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          user:users!questions_user_id_fkey (
            first_name,
            last_name,
            role,
            persona,
            family_id
          ),
          question_set:question_sets(*)
        `)
        .eq('id', questionId)
        .single();

      if (error) {
        // Error fetching new question
        return;
      }

      if (data) {
        // Add the new question to the state
        setQuestions(prev => [data, ...prev]);
      }
    } catch (err) {
      // Error in fetchNewQuestion
    }
  };

  // Handle like button click using server action
  const handleLike = async (questionId: string) => {
    if (isLiking) return;
    
    try {
      setIsLiking(true);
      
      // Optimistically update UI
      setQuestions(prev => 
        prev.map(q => {
          if (q.id === questionId) {
            const newHasLiked = !q.has_liked;
            return {
              ...q,
              has_liked: newHasLiked,
              like_count: newHasLiked ? q.like_count + 1 : q.like_count - 1
            };
          }
          return q;
        })
      );
      
      // Call server action to toggle like
      const result = await toggleQuestionLike(questionId);
      
      if (!result.success) {
        // Revert optimistic update if server action failed
        setQuestions(prev => 
          prev.map(q => {
            if (q.id === questionId) {
              const revertedHasLiked = !q.has_liked;
              return {
                ...q,
                has_liked: revertedHasLiked,
                like_count: revertedHasLiked ? q.like_count + 1 : q.like_count - 1
              };
            }
            return q;
          })
        );
        
        setError(result.error || 'Failed to update like');
      }
    } catch (err) {
      // Error in handleLike
      setError('Failed to update like');
    } finally {
      setIsLiking(false);
    }
  };

  // Handle creating a new question
  const handleCreateQuestion = () => {
    setIsCreateDialogOpen(true);
  };

  return (
    <QuestionGridBase
      questions={questions}
      questionSets={questionSets}
      loading={loading}
      error={error}
      showHeader={showHeader}
      limitCards={limitCards}
      onLike={handleLike}
      isLiking={isLiking}
      onCreateQuestion={handleCreateQuestion}
    />
  );
}
