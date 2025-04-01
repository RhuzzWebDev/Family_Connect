'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CreateQuestionForm from './CreateQuestionForm';
import { format } from 'date-fns';
import { ThumbsUp, MessageSquare, Image as ImageIcon, Video, Music, Trash2, AlertTriangle, PlusCircle, X, Heart } from 'lucide-react';
import Image from 'next/image';
import { CommentSection } from '@/components/comment-section';

interface QuestionLike {
  user_id: string;
}

interface Question {
  id: string;
  question: string;
  created_at: string;
  file_url: string | null;
  media_type: string | null;
  like_count: number;
  comment_count: number;
  user: {
    first_name: string;
    last_name: string;
    role: string;
    persona: string;
    family_id: string;
  };
  has_liked?: boolean;
  question_likes?: QuestionLike[];
  comments?: any[];
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  question_id: string;
  like_count: number;
  file_url: string | null;
  media_type: string | null;
  folder_path: string | null;
  parent_id: string | null;
  user: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

export default function QuestionGrid() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get current user
      const userEmail = sessionStorage.getItem('userEmail');
      if (!userEmail) {
        throw new Error('User not logged in');
      }

      // Get user from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (userError) {
        console.error('User fetch error:', userError);
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

      const familyUserIds = familyUsers.map(user => user.id);

      // Fetch questions with likes information
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
          question_likes!left (
            user_id
          ),
          like_count,
          comments:comments!left (
            id
          )
        `)
        .in('user_id', familyUserIds)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Process questions to add has_liked field
      const processedQuestions = (data || []).map(question => {
        // Get the actual like count from question_likes array length
        const actualLikeCount = question.question_likes?.length || 0;
        // Get the actual comment count from comments array length
        const actualCommentCount = question.comments?.length || 0;
        
        return {
          ...question,
          has_liked: question.question_likes?.some((like: QuestionLike) => like.user_id === userData.id) || false,
          like_count: actualLikeCount, // Use the actual count from the likes array
          comment_count: actualCommentCount // Use the actual count from the comments array
        };
      });

      setQuestions(processedQuestions);
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError('Failed to load questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (questionId: string) => {
    try {
      // Get current user
      const userEmail = sessionStorage.getItem('userEmail');
      if (!userEmail) {
        setError('You must be logged in to like questions');
        return;
      }

      // Get user from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (userError) {
        console.error('User fetch error:', userError);
        throw new Error('Failed to fetch user data');
      }

      if (!userData) {
        throw new Error('User not found');
      }

      // Get the current question data
      const { data: currentQuestion, error: questionError } = await supabase
        .from('questions')
        .select('like_count')
        .eq('id', questionId)
        .single();

      if (questionError) {
        console.error('Question fetch error:', questionError);
        throw new Error('Failed to fetch question data');
      }

      if (!currentQuestion) {
        throw new Error('Question not found');
      }

      const question = questions.find(q => q.id === questionId);
      if (!question) {
        throw new Error('Question not found in state');
      }

      // Ensure like_count is a number and default to 0 if null
      const currentLikeCount = currentQuestion.like_count || 0;

      // Optimistic update
      setQuestions(questions.map(q => {
        if (q.id === questionId) {
          return {
            ...q,
            like_count: question.has_liked ? currentLikeCount - 1 : currentLikeCount + 1,
            has_liked: !q.has_liked
          };
        }
        return q;
      }));

      if (question.has_liked) {
        // Unlike the question
        const { error: deleteError } = await supabase
          .from('question_likes')
          .delete()
          .eq('question_id', questionId)
          .eq('user_id', userData.id);

        if (deleteError) {
          console.error('Delete like error:', deleteError);
          throw new Error('Failed to unlike question');
        }

        const { error: updateError } = await supabase
          .from('questions')
          .update({ like_count: currentLikeCount - 1 })
          .eq('id', questionId);

        if (updateError) {
          console.error('Update count error:', updateError);
          throw new Error('Failed to update like count');
        }
      } else {
        // Like the question
        const { error: insertError } = await supabase
          .from('question_likes')
          .insert({
            question_id: questionId,
            user_id: userData.id
          });

        if (insertError) {
          console.error('Insert like error:', insertError);
          throw new Error('Failed to like question');
        }

        const { error: updateError } = await supabase
          .from('questions')
          .update({ like_count: currentLikeCount + 1 })
          .eq('id', questionId);

        if (updateError) {
          console.error('Update count error:', updateError);
          throw new Error('Failed to update like count');
        }
      }
    } catch (err) {
      console.error('Error handling like:', err);
      setError(err instanceof Error ? err.message : 'Failed to update like. Please try again.');
      // Revert optimistic update by refetching questions
      fetchQuestions();
    }
  };

  const handleCommentClick = (questionId: string) => {
    const question = questions.find(q => q.id === questionId) || null;
    setSelectedQuestionId(questionId);
    setSelectedQuestion(question);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const MediaPreview = ({ type, url }: { type: string | null; url: string | null }) => {
    if (!url) return null;

    switch (type) {
      case 'image':
        return (
          <div className="relative aspect-video w-full overflow-hidden rounded-md">
            <Image
              src={url || ''}
              alt="Media preview"
              fill
              className="object-contain"
              unoptimized={true}
            />
          </div>
        );
      case 'video':
        return (
          <div className="relative aspect-video w-full overflow-hidden rounded-md">
            <video
              src={url || ''}
              controls
              className="h-full w-full"
            />
          </div>
        );
      case 'audio':
        return (
          <div className="relative w-full overflow-hidden rounded-md bg-gray-50 p-4">
            <audio
              src={url || ''}
              controls
              className="w-full"
            />
          </div>
        );
      default:
        return null;
    }
  };

  const MediaTypeIcon = ({ type }: { type: string | null }) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-gray-400" />;
      case 'video':
        return <Video className="w-5 h-5 text-gray-400" />;
      case 'audio':
        return <Music className="w-5 h-5 text-gray-400" />;
      default:
        return null;
    }
  };

  useEffect(() => {
    fetchQuestions();

    // Subscribe to new questions and comment count updates
    const channel = supabase
      .channel('questions-channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'questions'
        }, 
        () => {
          fetchQuestions();
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments'
        },
        () => {
          // Refresh questions to update comment counts
          fetchQuestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-10 h-10 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin"></div>
        <p className="text-gray-500">Loading questions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-red-50 rounded-lg">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <p className="text-red-600 font-medium">{error}</p>
        <Button 
          onClick={fetchQuestions}
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Recent Questions</h2>
        {false && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                Ask Question
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white sm:max-w-[600px] p-0">
              <DialogHeader className="pt-8 px-6 pb-4 border-b">
                <DialogTitle className="text-lg font-semibold text-center">Ask a Question</DialogTitle>
              </DialogHeader>
              <div className="p-6">
                <CreateQuestionForm 
                  onQuestionCreated={() => {
                    // Refresh the page after creating a question
                    window.location.reload();
                  }} 
                  type="question" 
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500 text-center">No questions yet!</p>
          {false && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white mt-2">
                  Ask a Question
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white sm:max-w-[600px] p-0">
                <DialogHeader className="pt-8 px-6 pb-4 border-b">
                  <DialogTitle className="text-lg font-semibold text-center">Ask a Question</DialogTitle>
                </DialogHeader>
                <div className="p-6">
                  <CreateQuestionForm 
                    onQuestionCreated={() => {
                      // Refresh the page after creating a question
                      window.location.reload();
                    }} 
                    type="question" 
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {questions.map((question) => (
            <div 
              key={question.id} 
              className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-5 space-y-4 transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold shrink-0">
                  {getInitials(question.user.first_name, question.user.last_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <h3 className="font-semibold text-gray-900 line-clamp-1">
                        {question.user.first_name} {question.user.last_name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {question.user.role}
                        </span>
                        <time className="text-xs text-gray-500">
                          {format(new Date(question.created_at), 'MMM d, yyyy')}
                        </time>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-gray-700 line-clamp-3">{question.question}</p>
                  {question.file_url && (
                    <div className="mt-3 border rounded-md overflow-hidden">
                      <MediaPreview type={question.media_type} url={question.file_url} />
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    {/* Likes function */}
                    <div className="flex items-center gap-3">  
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(question.id)}
                        className={`${question.has_liked ? 'text-red-500' : 'text-gray-500'} hover:text-red-500`}
                      >
                        <Heart className={`w-4 h-4 ${question.has_liked ? 'fill-current' : ''}`} />
                        <span className="ml-1">{question.like_count}</span>
                      </Button>
                      {/* Comments function */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full h-8 px-3"
                        onClick={() => handleCommentClick(question.id)}
                      >
                        <MessageSquare className="w-4 h-4 mr-1.5" />
                        <span>{Math.abs(question.comment_count || 0)}</span>
                      </Button>
                    </div>
                    
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comments Dialog */}
      <Dialog open={!!selectedQuestionId} onOpenChange={(open) => {
        if (!open) {
          setSelectedQuestionId(null);
          setSelectedQuestion(null);
        }
      }}>
        <DialogContent className="bg-white sm:max-w-[600px] p-0">
          <DialogHeader className="pt-8 px-6 pb-4 border-b">
            <DialogTitle className="text-lg font-semibold text-center">Comments</DialogTitle>
          </DialogHeader>
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {selectedQuestion && (
              <div className="mb-6 border rounded-lg p-4 bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {getInitials(selectedQuestion.user.first_name, selectedQuestion.user.last_name)}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">
                        {selectedQuestion.user.first_name} {selectedQuestion.user.last_name}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {selectedQuestion.user.role}
                      </span>
                      <time className="text-xs text-gray-500 ml-auto">
                        {format(new Date(selectedQuestion.created_at), 'MMM d, yyyy')}
                      </time>
                    </div>
                    <p className="mt-2 text-gray-700">{selectedQuestion.question}</p>
                    {selectedQuestion.file_url && (
                      <div className="mt-3 border rounded-md overflow-hidden">
                        <MediaPreview type={selectedQuestion.media_type} url={selectedQuestion.file_url} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {selectedQuestionId && <CommentSection questionId={selectedQuestionId} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
