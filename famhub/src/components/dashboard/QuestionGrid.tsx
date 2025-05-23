'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import CreateQuestionForm from './CreateQuestionForm';
import QuestionGridBase, { Question, QuestionSet } from './QuestionGridBase';

interface QuestionGridProps {
  limitCards?: number;
  showHeader?: boolean;
  initialQuestions?: Question[];
  initialQuestionSets?: QuestionSet[];
}

export default function QuestionGrid({ limitCards, showHeader = true, initialQuestions, initialQuestionSets }: QuestionGridProps) {
  // Use NextAuth session instead of sessionStorage
  const { data: session, status: sessionStatus } = useSession();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [isLiking, setIsLiking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch question sets with question counts in a single query
  const fetchQuestionSets = async () => {
    try {
      // Fetching question sets with counts
      
      // If we have initial question sets from server-side props, use those instead of fetching
      if (initialQuestionSets && initialQuestionSets.length > 0) {
        setQuestionSets(initialQuestionSets);
        return;
      }
      
      // Get all question sets with their questions
      const { data, error } = await supabase
        .from('question_sets')
        .select(`
          *,
          questions!question_set_id(id)
        `);
      
      if (error) {
        // Error fetching question sets with counts
        return;
      }
      
      if (!data || data.length === 0) {
        // No question sets found
        setQuestionSets([]);
        return;
      }
      
      // Process the data to include question counts
      const questionSetsWithCounts = data.map(set => {
        // The questions field will be an array of question objects
        const questionCount = Array.isArray(set.questions) ? set.questions.length : 0;
        
        // Create a new object without the questions array (we just need the count)
        const { questions, ...setWithoutQuestions } = set;
        
        return {
          ...setWithoutQuestions,
          question_count: questionCount
        };
      });
      
      // Question sets with counts
      setQuestionSets(questionSetsWithCounts);
    } catch (err) {
      // Error in fetchQuestionSets
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get current user from NextAuth session
      const userEmail = session?.user?.email;
      
      // Safety check - ensure we have a user email
      if (!userEmail) {
        // No user email found in session
        setLoading(false);
        setError('User email not found');
        return;
      }
      
      // If we have initial questions from server-side props, use those instead of fetching
      if (initialQuestions && initialQuestions.length > 0) {
        setQuestions(initialQuestions);
        setLoading(false);
        return;
      }

      // Get user from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (userError) {
        // User fetch error
        throw new Error('Failed to fetch user data');
      }

      if (!userData) {
        throw new Error('User not found');
      }

      // First, get the current user to find their family_id
      const { data: currentUser, error: userFamilyError } = await supabase
        .from('users')
        .select('family_id')
        .eq('email', userEmail)
        .single();

      if (userFamilyError) {
        throw userFamilyError;
      }

      if (!currentUser || !currentUser.family_id) {
        throw new Error('Family ID not found');
      }

      // Then get all users in the same family
      const { data: familyUsers, error: familyError } = await supabase
        .from('users')
        .select('id')
        .eq('family_id', currentUser.family_id);

      if (familyError) {
        throw familyError;
      }

      if (!familyUsers || familyUsers.length === 0) {
        throw new Error('No family members found');
      }

      // Extract user IDs
      const familyUserIds = familyUsers.map(user => user.id);

      // Get questions from all family members
      const { data: questionsData, error: questionsError } = await supabase
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
        .in('user_id', familyUserIds)
        .order('created_at', { ascending: false });

      if (questionsError) {
        throw questionsError;
      }

      if (!questionsData) {
        throw new Error('No questions found');
      }

      // Get likes for the current user
      const { data: likesData, error: likesError } = await supabase
        .from('question_likes')
        .select('question_id')
        .eq('user_id', userData.id);
        
      if (likesError) {
        // Error fetching likes
      }
      
      // Create a set of question IDs that the user has liked
      const likedQuestionIds = new Set(
        (likesData || []).map(like => like.question_id)
      );
      
      // Process questions to include has_liked flag
      const processedQuestions = questionsData.map(question => {
        // Check if this question ID is in the set of liked question IDs
        const hasLiked = likedQuestionIds.has(question.id);
        
        // Add a stable sort key (created_at timestamp as number)
        const sortKey = new Date(question.created_at).getTime();

        return {
          ...question,
          has_liked: hasLiked,
          sortKey
        };
      });

      // Sort questions by created_at (newest first)
      const sortedQuestions = processedQuestions.sort((a, b) => {
        return (b.sortKey || 0) - (a.sortKey || 0);
      });

      setQuestions(sortedQuestions);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load questions');
      setLoading(false);
    }
  };

  // Set up real-time subscription for new questions
  useEffect(() => {
    // Only set up subscription if we have a session and are authenticated
    if (sessionStatus !== 'authenticated' || !session?.user?.email) return;

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
  }, [sessionStatus, session]);

  // Fetch a single new question with all related data
  const fetchNewQuestion = async (questionId: string) => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', session?.user?.email)
        .single();

      if (!userData) return;

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
        return;
      }

      if (data) {
        // Check if this user has liked the question with a separate query
        const { data: likesData } = await supabase
          .from('question_likes')
          .select('*')
          .eq('question_id', questionId)
          .eq('user_id', userData.id);
        
        const hasLiked = likesData && likesData.length > 0;

        // Add the new question to the state
        const newQuestion = {
          ...data,
          has_liked: hasLiked,
          sortKey: new Date(data.created_at).getTime()
        };

        setQuestions(prev => [newQuestion, ...prev]);
      }
    } catch (err) {
      // Error in fetchNewQuestion
    }
  };

  // Handle like button click
  const handleLike = async (questionId: string) => {
    if (isLiking) return;
    
    try {
      setIsLiking(true);
      
      // Get current user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', session?.user?.email)
        .single();

      if (userError) {
        throw new Error('Failed to get user data');
      }

      if (!userData) {
        throw new Error('User not found');
      }

      // Find the question in state
      const question = questions.find(q => q.id === questionId);
      if (!question) {
        throw new Error('Question not found');
      }

      // Check if user has already liked this question
      const hasLiked = question.has_liked || false;

      // Optimistically update UI
      setQuestions(prev => 
        prev.map(q => {
          if (q.id === questionId) {
            return {
              ...q,
              has_liked: !hasLiked,
              like_count: hasLiked ? q.like_count - 1 : q.like_count + 1
            };
          }
          return q;
        })
      );
      
      if (hasLiked) {
        // Unlike: Delete the like
        const { error: deleteError } = await supabase
          .from('question_likes')
          .delete()
          .eq('question_id', questionId)
          .eq('user_id', userData.id);

        if (deleteError) {
          throw new Error('Failed to unlike');
        }
      } else {
        // Like: Insert a new like
        const { error: insertError } = await supabase
          .from('question_likes')
          .insert({
            question_id: questionId,
            user_id: userData.id
          });

        if (insertError) {
          throw new Error('Failed to like');
        }
      }
    } catch (err: any) {
      // Revert the optimistic update
      setQuestions(prev => {
        const question = prev.find(q => q.id === questionId);
        if (!question) return prev;
        
        const hasLiked = question.has_liked || false;
        
        return prev.map(q => {
          if (q.id === questionId) {
            return {
              ...q,
              has_liked: hasLiked,
              like_count: hasLiked ? q.like_count : q.like_count - 1
            };
          }
          return q;
        });
      });
      
      setError(err.message || 'Failed to update like');
    } finally {
      setIsLiking(false);
    }
  };

  // Fetch data when session is loaded
  useEffect(() => {
    // Only fetch data when the session is fully loaded and authenticated
    if (sessionStatus === 'authenticated' && session?.user?.email) {
      fetchQuestions();
      fetchQuestionSets();
    } else if (sessionStatus === 'unauthenticated') {
      // If user is not authenticated, show appropriate message
      setLoading(false);
      setError('Please log in to view questions');
    } else if (initialQuestions) {
      // If we have initial questions from server-side props, use those
      setQuestions(initialQuestions);
      if (initialQuestionSets) {
        setQuestionSets(initialQuestionSets);
      }
      setLoading(false);
    }
  }, [sessionStatus, session, initialQuestions, initialQuestionSets]);

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
