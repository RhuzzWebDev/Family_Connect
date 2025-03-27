'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CreateQuestionForm from './CreateQuestionForm';
import { format } from 'date-fns';
import { ThumbsUp, MessageSquare, Image as ImageIcon, Video, Music, Trash2, AlertTriangle, PlusCircle, X } from 'lucide-react';
import Image from 'next/image';
import { CommentSection } from '@/components/comment-section';

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
    try {
      // Get the current user's email from sessionStorage
      const userEmail = sessionStorage.getItem('userEmail');
      
      if (!userEmail) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      // First, get the current user to find their family_id
      const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('family_id')
        .eq('email', userEmail)
        .single();

      if (userError) {
        throw userError;
      }

      if (!currentUser || !currentUser.family_id) {
        setError('User not associated with a family');
        setLoading(false);
        return;
      }

      // Get all users in the same family
      const { data: familyUsers, error: familyError } = await supabase
        .from('users')
        .select('id')
        .eq('family_id', currentUser.family_id);

      if (familyError) {
        throw familyError;
      }

      if (!familyUsers || familyUsers.length === 0) {
        setError('No family members found');
        setLoading(false);
        return;
      }

      // Get the user IDs from the family
      const familyUserIds = familyUsers.map(user => user.id);

      // Then fetch questions only from users in the same family
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          user:users!inner (
            first_name,
            last_name,
            role,
            persona,
            family_id
          )
        `)
        .in('user_id', familyUserIds)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Make sure we have valid data before setting state
      const validQuestions = (data || []).filter(question => 
        question && question.user && question.user.first_name
      );

      setQuestions(validQuestions);
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ like_count: questions.find(q => q.id === questionId)?.like_count! + 1 })
        .eq('id', questionId);

      if (error) {
        throw error;
      }

      setQuestions(questions.map(q =>
        q.id === questionId ? { ...q, like_count: q.like_count + 1 } : q
      ));
    } catch (err) {
      console.error('Error liking question:', err);
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
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full h-8 px-3"
                        onClick={() => handleLike(question.id)}
                      >
                        <ThumbsUp className="w-4 h-4 mr-1.5" />
                        <span>{question.like_count}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full h-8 px-3"
                        onClick={() => handleCommentClick(question.id)}
                      >
                        <MessageSquare className="w-4 h-4 mr-1.5" />
                        <span>{question.comment_count}</span>
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
