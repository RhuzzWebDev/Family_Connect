'use client';

import { useEffect, useState } from 'react';
import FilterDropdown, { ViewType } from './FilterDropdown';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CreateQuestionForm from './CreateQuestionForm';
import { format, formatDistanceToNow } from 'date-fns';
import { ThumbsUp, MessageSquare, Image as ImageIcon, Video, Music, Trash2, AlertTriangle, PlusCircle, X, Heart, MoreHorizontal, Share2, Maximize2, Minimize2 } from 'lucide-react';
import Image from 'next/image';
import { CommentSection } from '@/components/comment-section';
import { cn } from '@/lib/utils';

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

interface QuestionGridProps {
  limitCards?: number;
  showHeader?: boolean;
}

export default function QuestionGrid({ limitCards, showHeader = true }: QuestionGridProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [viewType, setViewType] = useState<ViewType>('card');

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
    // Don't proceed if already processing a like action
    if (isLiking) return;
    
    try {
      // Set liking state to show loading indicator
      setIsLiking(true);
      
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

      // Optimistic update for questions list
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
      
      // Also update selectedQuestion if it's the one being liked
      if (selectedQuestion && selectedQuestion.id === questionId) {
        setSelectedQuestion({
          ...selectedQuestion,
          like_count: question.has_liked ? currentLikeCount - 1 : currentLikeCount + 1,
          has_liked: !question.has_liked
        });
      }

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
    } finally {
      // Reset liking state when done
      setIsLiking(false);
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
      {showHeader && (
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Recent Questions</h2>
          <div className="flex items-center gap-2">
            <FilterDropdown 
              viewType={viewType}
              setViewType={setViewType}
            />
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
        </div>
      )}

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
      ) : viewType === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 md:gap-6">
          {questions.slice(0, limitCards || questions.length).map((question) => (
            <Card 
              key={question.id} 
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleCommentClick(question.id)}
            >
              {/* Media at the top if available */}
              {question.file_url && (
                <div className="w-full">
                  <MediaPreview type={question.media_type} url={question.file_url} />
                </div>
              )}
              
              {/* Question content in the middle */}
              <CardContent className="p-4">
                <p className="text-base font-medium">{question.question}</p>
              </CardContent>
              
              {/* User info and actions in the footer */}
              <CardFooter className="flex items-center justify-between p-4 pt-0">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={`/avatars/${question.user.role.toLowerCase()}.png`} alt={question.user.first_name} />
                    <AvatarFallback>{getInitials(question.user.first_name, question.user.last_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-medium">{`${question.user.first_name} ${question.user.last_name}`}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-muted-foreground">{question.user.role}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-8 w-8 p-0", { "text-red-500": question.has_liked })}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click event
                      handleLike(question.id);
                    }}
                  >
                    <Heart className={cn("h-4 w-4", { "fill-current text-red-500": question.has_liked })} />
                    <span className="sr-only">Like</span>
                  </Button>
                  <span className="text-xs">{question.like_count.toString()}</span>
                  
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    <span className="text-xs">{Math.abs(question.comment_count || 0).toString()}</span>
                  </span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <div 
              key={question.id}
              className="flex flex-col sm:flex-row gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleCommentClick(question.id)}
            >
              <div className="flex items-start gap-3 sm:w-1/4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={`/avatars/${question.user.role.toLowerCase()}.png`} alt={question.user.first_name} />
                  <AvatarFallback>{getInitials(question.user.first_name, question.user.last_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{`${question.user.first_name} ${question.user.last_name}`}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <p className="text-xs text-muted-foreground">{question.user.role}</p>
                    <span className="hidden sm:inline text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1">
                <p className="text-base mb-3">{question.question}</p>
                
                {/* Media preview removed from list view */}
                {question.media_type && (
                  <span className="flex items-center gap-1 text-gray-500 mb-3">
                    <MediaTypeIcon type={question.media_type} />
                    <span className="text-xs capitalize">{question.media_type} attached</span>
                  </span>
                )}
                
                <div className="flex items-center gap-4 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-8 px-2", { "text-red-500": question.has_liked })}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(question.id);
                    }}
                  >
                    <Heart className={cn("h-4 w-4 mr-1", { "fill-current text-red-500": question.has_liked })} />
                    <span className="text-xs">{question.like_count > 0 ? question.like_count : "Like"}</span>
                  </Button>
                  
                  <span className="flex items-center gap-1 text-gray-500">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-xs">{question.comment_count > 0 ? `${question.comment_count} comments` : "Comment"}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Side Panel for Comments */}
      {selectedQuestionId && selectedQuestion && (
        <div 
          className={`fixed inset-y-0 right-0 z-50 w-full ${isFullWidth ? 'md:w-full' : 'md:w-1/2'} bg-black/70 transform transition-all duration-300 ease-in-out ${!!selectedQuestionId ? "translate-x-0" : "translate-x-full"}`}
          onClick={() => {
            setSelectedQuestionId(null);
            setSelectedQuestion(null);
          }}
        >
          <div
            className="h-full bg-white flex flex-col overflow-hidden rounded-l-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-500 hover:text-gray-900 mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFullWidth(!isFullWidth);
                  }}
                >
                  {isFullWidth ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <div className="w-8 h-8 rounded-full bg-gray-600 overflow-hidden">
                  <Image
                    src="/logo.svg"
                    alt="Community logo"
                    width={32}
                    height={32}
                    className="object-cover"
                  />
                </div>
                <span className="font-medium">All Community Members</span>
              </div>
              <div className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-gray-500 hover:text-gray-900" 
                  onClick={() => {
                    setSelectedQuestionId(null);
                    setSelectedQuestion(null);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Author info */}
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`/avatars/${selectedQuestion.user.role.toLowerCase()}.png`} alt={selectedQuestion.user.first_name} />
                    <AvatarFallback>{getInitials(selectedQuestion.user.first_name, selectedQuestion.user.last_name)}</AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {`${selectedQuestion.user.first_name} ${selectedQuestion.user.last_name}`}
                    <span className="bg-orange-500 rounded-full w-2 h-2"></span>
                  </div>
                  <div className="text-sm text-gray-500">{selectedQuestion.user.role}</div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-grow overflow-y-auto">
              <div className="max-w-lg mx-auto">
                {/* Media if available */}
                {selectedQuestion.file_url && (
                  <div className="w-full rounded-md overflow-hidden mb-6">
                    <MediaPreview type={selectedQuestion.media_type} url={selectedQuestion.file_url} />
                  </div>
                )}
                
                <h2 className="text-2xl font-semibold mb-6">{selectedQuestion.question}</h2>
                
                {/* Comments section */}
                <div className="mt-8">
                  {selectedQuestionId && <CommentSection questionId={selectedQuestionId} />}
                </div>
                
               
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t">
             

              <div className="flex items-center justify-center mb-4">
                <Button 
                  variant="ghost" 
                  className={cn("text-gray-500 hover:text-gray-900 relative", { "text-red-500": selectedQuestion.has_liked })}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLike(selectedQuestion.id);
                  }}
                  disabled={isLiking}
                >
                  <Heart className={cn("h-5 w-5 mr-2", { "fill-current text-red-500": selectedQuestion.has_liked })} />
                  <span className="relative">
                    {selectedQuestion.like_count > 0 ? `${selectedQuestion.like_count} cheers` : "Be the first to cheer this"}
                    {isLiking && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="animate-pulse">...</span>
                      </span>
                    )}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
