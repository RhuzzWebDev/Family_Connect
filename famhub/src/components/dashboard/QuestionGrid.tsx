'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
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
import { QuestionSetCard } from './QuestionSetCard';

interface QuestionLike {
  user_id: string;
}

interface QuestionSet {
  id: string;
  title: string;
  description: string | null;
  author_name: string | null;
  resource_url: string | null;
  donate_url: string | null;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
  question_count?: number; // Count of questions in this set
}

interface Question {
  id: string;
  question: string;
  created_at: string;
  file_url: string | null;
  media_type: string | null;
  like_count: number;
  comment_count: number;
  question_set_id: string | null;
  question_set: QuestionSet | null;
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
  sortKey?: number; // Added for stable sorting
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
  initialQuestions?: Question[];
  initialQuestionSets?: QuestionSet[];
}

export default function QuestionGrid({ limitCards, showHeader = true, initialQuestions, initialQuestionSets }: QuestionGridProps) {
  // Use NextAuth session instead of sessionStorage
  const { data: session } = useSession();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [viewType, setViewType] = useState<ViewType>('card');

  // Fetch question sets with question counts in a single query
  const fetchQuestionSets = async () => {
    try {
      console.log('Fetching question sets with counts...');
      
      // Get all question sets with their questions
      const { data, error } = await supabase
        .from('question_sets')
        .select(`
          *,
          questions!question_set_id(id)
        `);
      
      if (error) {
        console.error('Error fetching question sets with counts:', error);
        return;
      }
      
      if (!data || data.length === 0) {
        console.log('No question sets found');
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
      
      console.log('Question sets with counts:', questionSetsWithCounts);
      setQuestionSets(questionSetsWithCounts);
    } catch (err) {
      console.error('Error in fetchQuestionSets:', err);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get current user from NextAuth session
      const userEmail = session?.user?.email;
      
      // If we have initial questions from server-side props, use those instead of fetching
      if (initialQuestions && initialQuestions.length > 0) {
        setQuestions(initialQuestions);
        setLoading(false);
        return;
      }
      
      // Only check for user email if we need to fetch questions from the client
      if (!userEmail && !initialQuestions) {
        console.log('No user email found in session');
        // Don't throw error if we're still loading the session
        if (!initialQuestions) {
          setLoading(false);
          return;
        }
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

      // Fetch questions with user info and question set data
      console.log('Fetching questions with question_sets data...');
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
        .in('user_id', familyUserIds)
        .order('created_at', { ascending: false });
      
      console.log('Query result:', { data, error });

      if (error) {
        throw error;
      }
      
      // Fetch the current user's likes
      const { data: userLikes, error: likesError } = await supabase
        .from('question_likes')
        .select('question_id')
        .eq('user_id', userData.id);
        
      if (likesError) {
        console.error('Error fetching user likes:', likesError);
        // Continue anyway, just won't show liked status
      }
      
      // Create a set of liked question IDs for faster lookup
      const likedQuestionIds = new Set(userLikes?.map(like => like.question_id) || []);
      
      // Add has_liked property to each question and preserve order
      console.log('Raw data from API:', data);
      const questionsWithLikes = (data || []).map(question => {
        console.log('Processing question:', question.id, 'question_set:', question.question_set);
        return {
          ...question,
          has_liked: likedQuestionIds.has(question.id),
          // Add a stable sort key based on creation date
          sortKey: new Date(question.created_at).getTime()
        };
      });
      
      // Sort by the stable sort key (creation date timestamp)
      const sortedQuestions = [...questionsWithLikes].sort((a, b) => b.sortKey - a.sortKey);
      
      console.log('Sorted questions with question_sets:', sortedQuestions);
      setQuestions(sortedQuestions);
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
      
      // Get current user from NextAuth session
      const userEmail = session?.user?.email;
      if (!userEmail) {
        setError('You must be logged in to like questions');
        return;
      }
      
      // Set user context for RLS policies
      await supabase.rpc('set_app_user', { p_email: userEmail });

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

      // Optimistic update for questions list while preserving order
      setQuestions(questions.map(q => {
        if (q.id === questionId) {
          return {
            ...q,
            like_count: question.has_liked ? currentLikeCount - 1 : currentLikeCount + 1,
            has_liked: !q.has_liked,
            // Preserve the sortKey to maintain position
            sortKey: q.sortKey
          };
        }
        return q;
      }));
      
      // Also update selectedQuestion if it's the one being liked
      if (selectedQuestion && selectedQuestion.id === questionId) {
        setSelectedQuestion({
          ...selectedQuestion,
          like_count: question.has_liked ? currentLikeCount - 1 : currentLikeCount + 1,
          has_liked: !question.has_liked,
          // Preserve the sortKey to maintain position
          sortKey: selectedQuestion.sortKey
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
    // Initialize with server-side data if available
    if (initialQuestions && initialQuestions.length > 0) {
      setQuestions(initialQuestions);
      setLoading(false);
    }
    
    if (initialQuestionSets && initialQuestionSets.length > 0) {
      setQuestionSets(initialQuestionSets);
    }
    
    // Only fetch from client-side if we have a session and no initial data
    if (session?.user?.email) {
      if (!initialQuestions || initialQuestions.length === 0) {
        fetchQuestions();
      }
      
      if (!initialQuestionSets || initialQuestionSets.length === 0) {
        fetchQuestionSets();
      }
    }

    // Subscribe to new questions, question sets, and comment count updates
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
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'question_sets'
        },
        () => {
          // Refresh question sets when they change
          fetchQuestionSets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, initialQuestions, initialQuestionSets]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4" style={{ background: '#0F1017', color: '#fff' }}>
        <div className="w-10 h-10 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin"></div>
        <p className="text-gray-500">Loading questions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 rounded-lg" style={{ background: '#232336', color: '#fff' }}>
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
    <div className="space-y-6" style={{ background: '#0F1017', color: '#fff', minHeight: '100vh', padding: '1.5rem' }}>
      {showHeader && (
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-300">Recent Questions</h2>
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

      {questions.length === 0 && questionSets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 rounded-lg border border-dashed" style={{ background: '#181926', color: '#fff', borderColor: '#232336' }}>
          <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500 text-center">No questions or question sets yet!</p>
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
        // card of question display
      ) : viewType === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-4 gap-4 md:gap-6 2xl:gap-8">
          {/* Display Question Sets */}
          {questionSets.length > 0 && (
            <div className="col-span-full mb-8">
              <h2 className="text-xl font-semibold text-gray-300 mb-4">Question Sets</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-4 gap-4 md:gap-6 2xl:gap-8">
                {questionSets.map((set) => (
                  <QuestionSetCard key={set.id} questionSet={set} />
                ))}
              </div>
            </div>
          )}
          
          {/* Display Questions */}
          <div className="col-span-full">
            <h2 className="text-xl font-semibold text-gray-300 mb-4">Questions</h2>
          </div>
          {questions.slice(0, limitCards || questions.length).map((question) => (
            <Card 
              key={question.id} 
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              style={{ background: '#181926', color: '#fff', border: '1px solid #232336' }}
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
                
                {/* Question set badge in card view */}
                {question.question_set && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-900 text-blue-300">
                      {question.question_set.title}
                    </span>
                  </div>
                )}
              </CardContent>
              
              {/* User info and actions in the footer */}
              <CardFooter className="flex items-center justify-between p-4 pt-0">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full flex items-center justify-center font-semibold" style={{ background: '#0F1017', color: '#60a5fa' }}>
                    {getInitials(question.user.first_name, question.user.last_name)}
                  </div>
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
        <div className="space-y-4" style={{ background: '#0F1017', color: '#fff' }}>
          {/* Display Question Sets in list view */}
          {questionSets.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-300 mb-4">Question Sets</h2>
              <div className="space-y-4">
                {questionSets.map((set) => (
                  <div 
                    key={set.id}
                    className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg border cursor-pointer"
                    style={{ background: '#181926', color: '#fff', border: '1px solid #232336' }}
                    onClick={() => {
                      // We'll use the QuestionSetCard component's dialog functionality
                      // by clicking on a hidden instance of it
                      const hiddenCard = document.getElementById(`hidden-question-set-${set.id}`);
                      if (hiddenCard) {
                        hiddenCard.click();
                      }
                    }}
                  >
                    {/* Left side: Image and basic info */}
                    <div className="flex items-start gap-3 sm:w-1/4">
                      {set.cover_image ? (
                        <div className="h-16 w-16 rounded overflow-hidden relative flex-shrink-0">
                          <Image
                            src={set.cover_image}
                            alt={set.title}
                            fill
                            className="object-cover"
                            unoptimized={true}
                          />
                        </div>
                      ) : (
                        <div className="h-16 w-16 rounded bg-blue-900 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl font-bold text-blue-300">{set.title.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium text-blue-400">{set.title}</h3>
                        {set.author_name && (
                          <p className="text-xs text-gray-400">By {set.author_name}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(set.created_at), { addSuffix: true })}
                        </p>
                        <div className="flex items-center mt-1">
                          <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full">
                            {set.question_count || 0} question{(set.question_count !== 1) ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right side: Description and actions */}
                    <div className="flex-1">
                      {set.description && (
                        <p className="text-sm text-gray-300 mb-3">{set.description}</p>
                      )}
                      
                      <div className="flex items-center gap-3 mt-2">
                        {set.resource_url && (
                          <a 
                            href={set.resource_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded-full hover:bg-blue-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Resource
                          </a>
                        )}
                        
                        {set.donate_url && (
                          <a 
                            href={set.donate_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full hover:bg-green-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Support
                          </a>
                        )}
                      </div>
                    </div>
                    
                    {/* Hidden QuestionSetCard for dialog functionality */}
                    <div className="hidden">
                      <QuestionSetCard 
                        key={`hidden-${set.id}`} 
                        questionSet={set} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Display Questions in list view */}
          <h2 className="text-xl font-semibold text-gray-300 mb-4">Questions</h2>
          {questions.map((question) => (
            <div 
              key={question.id}
              className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg border"
              style={{ background: '#181926', color: '#fff', border: '1px solid #232336' }}
              onClick={() => handleCommentClick(question.id)}
            >
              <div className="flex items-start gap-3 sm:w-1/4">
                <div className="h-10 w-10 rounded-full flex items-center justify-center font-semibold" style={{ background: '#0F1017', color: '#60a5fa' }}>
                  {getInitials(question.user.first_name, question.user.last_name)}
                </div>
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
                <p className="text-base mb-2">{question.question}</p>
                
                {/* Question set badge in list view */}
                {question.question_set && (
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-900 text-blue-300">
                      {question.question_set.title}
                    </span>
                    {question.question_set.author_name && (
                      <span className="text-xs text-gray-400">
                        by {question.question_set.author_name}
                      </span>
                    )}
                  </div>
                )}
                
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
            className="h-full flex flex-col overflow-hidden rounded-l-2xl"
            style={{ background: '#181926', color: '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4" style={{ background: '#20212b', color: '#e5e7eb' }}>
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
            <div className="p-4 border-b" style={{ background: '#20212b', color: '#e5e7eb', borderColor: '#232336' }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full flex items-center justify-center font-semibold" style={{ background: '#0F1017', color: '#60a5fa' }}>
                  {selectedQuestion.user.first_name.charAt(0)}{selectedQuestion.user.last_name.charAt(0)}
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
            <div className="p-6 flex-grow overflow-y-auto" style={{ background: '#181926', color: '#fff' }}>
              <div className="max-w-lg mx-auto" style={{ color: '#fff' }}>
                {/* Media if available */}
                {selectedQuestion.file_url && (
                  <div className="w-full rounded-md overflow-hidden mb-6">
                    <MediaPreview type={selectedQuestion.media_type} url={selectedQuestion.file_url} />
                  </div>
                )}
                
                <h2 className="text-2xl font-semibold mb-4" style={{ color: '#fff' }}>{selectedQuestion.question}</h2>
                
                {/* Question set details in detail view */}
                {selectedQuestion.question_set && (
                  <div className="mb-6 p-4 rounded-lg" style={{ background: '#20212b' }}>
                    <div className="flex items-center gap-2 mb-2">
                      {selectedQuestion.question_set.cover_image && (
                        <div className="w-10 h-10 rounded overflow-hidden">
                          <Image
                            src={selectedQuestion.question_set.cover_image}
                            alt="Set cover"
                            width={40}
                            height={40}
                            className="object-cover"
                            unoptimized={true}
                          />
                        </div>
                      )}
                      <h3 className="text-lg font-medium text-blue-400">
                        {selectedQuestion.question_set.title}
                      </h3>
                    </div>
                    
                    {selectedQuestion.question_set.description && (
                      <p className="text-sm text-gray-300 mb-3">
                        {selectedQuestion.question_set.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      {selectedQuestion.question_set.author_name && (
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded-full">
                          By {selectedQuestion.question_set.author_name}
                        </span>
                      )}
                      
                      {selectedQuestion.question_set.resource_url && (
                        <a 
                          href={selectedQuestion.question_set.resource_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded-full hover:bg-blue-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Resource
                        </a>
                      )}
                      
                      {selectedQuestion.question_set.donate_url && (
                        <a 
                          href={selectedQuestion.question_set.donate_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full hover:bg-green-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Support
                        </a>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Comments section */}
                <div className="mt-8">
                  {selectedQuestionId && <CommentSection questionId={selectedQuestionId} />}
                </div>
                
               
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t" style={{ background: '#20212b', color: '#e5e7eb', borderColor: '#232336' }}>
             

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
