'use client';

import { useState, useEffect } from 'react';
import FilterDropdown, { ViewType } from './FilterDropdown';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import CreateQuestionForm from './CreateQuestionForm';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp, MessageSquare, Image as ImageIcon, Video, Music, Heart } from 'lucide-react';
import Image from 'next/image';
import { CommentSection } from '@/components/comment-section';
import { cn } from '@/lib/utils';
import { QuestionSetCard } from './QuestionSetCard';
import { toggleQuestionLike } from '@/lib/server/actions';

// Define types
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
  question_count?: number;
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
  has_liked?: boolean;
  user: {
    first_name: string;
    last_name: string;
    role: string;
    persona: string;
    family_id: string;
  };
}

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
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [viewType, setViewType] = useState<ViewType>('card');

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
        console.error('Error fetching new question:', error);
        return;
      }

      if (data) {
        // Add the new question to the state
        setQuestions(prev => [data, ...prev]);
      }
    } catch (err) {
      console.error('Error in fetchNewQuestion:', err);
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
      console.error('Error in handleLike:', err);
      setError('Failed to update like');
    } finally {
      setIsLiking(false);
    }
  };

  // Handle opening comment section
  const handleOpenComments = (question: Question) => {
    setSelectedQuestionId(question.id);
    setSelectedQuestion(question);
  };

  // Filter questions if limitCards is provided
  const displayQuestions = limitCards ? questions.slice(0, limitCards) : questions;

  // Render different views based on viewType
  const renderQuestions = () => {
    if (viewType === 'list') {
      // List view rendering
      return (
        <div className="space-y-4">
          {displayQuestions.map(question => (
            <div key={question.id} className="bg-[#1A1C23] rounded-lg p-4 border border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-600 text-white">
                    {question.user.first_name[0]}{question.user.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium text-white">
                    {question.user.first_name} {question.user.last_name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {question.user.role} • {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
              <p className="text-gray-200 mb-3">{question.question}</p>
              <div className="flex items-center gap-4 text-gray-400">
                <button 
                  onClick={() => handleLike(question.id)}
                  className={`flex items-center gap-1 ${question.has_liked ? 'text-red-500' : ''}`}
                  disabled={isLiking}
                >
                  {question.has_liked ? <Heart className="h-4 w-4 fill-red-500 text-red-500" /> : <ThumbsUp className="h-4 w-4" />}
                  <span className="text-xs">{question.like_count}</span>
                </button>
                <button 
                  onClick={() => handleOpenComments(question)}
                  className="flex items-center gap-1"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs">{question.comment_count}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    } else if (viewType === 'sets') {
      // Question sets view
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {questionSets.map(set => (
            <QuestionSetCard key={set.id} questionSet={set} />
          ))}
        </div>
      );
    } else {
      // Default card view
      return (
        <div className={cn(
          "grid gap-6",
          isFullWidth ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        )}>
          {displayQuestions.map(question => (
            <Card key={question.id} className="bg-[#1A1C23] border-gray-800 overflow-hidden">
              <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-600 text-white">
                    {question.user.first_name[0]}{question.user.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium text-white">
                    {question.user.first_name} {question.user.last_name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {question.user.role} • {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <p className="text-gray-200">{question.question}</p>
                
                {question.file_url && question.media_type === 'image' && (
                  <div className="mt-3 relative rounded-md overflow-hidden">
                    <Image 
                      src={question.file_url} 
                      alt="Question image"
                      width={500}
                      height={300}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}
                
                {question.file_url && question.media_type === 'video' && (
                  <div className="mt-3 relative rounded-md overflow-hidden">
                    <video 
                      src={question.file_url}
                      controls
                      className="w-full h-auto"
                    />
                  </div>
                )}
                
                {question.file_url && question.media_type === 'audio' && (
                  <div className="mt-3">
                    <audio 
                      src={question.file_url}
                      controls
                      className="w-full"
                    />
                  </div>
                )}
                
                {question.question_set && (
                  <div className="mt-3 bg-blue-900/20 p-2 rounded-md border border-blue-800 flex items-center gap-2">
                    <div className="text-xs text-blue-300">From question set: <span className="font-medium">{question.question_set.title}</span></div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-3 pt-0 flex items-center gap-4 text-gray-400">
                <button 
                  onClick={() => handleLike(question.id)}
                  className={`flex items-center gap-1 ${question.has_liked ? 'text-red-500' : ''}`}
                  disabled={isLiking}
                >
                  {question.has_liked ? <Heart className="h-4 w-4 fill-red-500 text-red-500" /> : <ThumbsUp className="h-4 w-4" />}
                  <span className="text-xs">{question.like_count}</span>
                </button>
                <button 
                  onClick={() => handleOpenComments(question)}
                  className="flex items-center gap-1"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs">{question.comment_count}</span>
                </button>
                {question.media_type && (
                  <div className="flex items-center gap-1 ml-auto">
                    {question.media_type === 'image' && <ImageIcon className="h-4 w-4" />}
                    {question.media_type === 'video' && <Video className="h-4 w-4" />}
                    {question.media_type === 'audio' && <Music className="h-4 w-4" />}
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="pb-16">
      {showHeader && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <FilterDropdown viewType={viewType} setViewType={setViewType} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullWidth(!isFullWidth)}
              className="text-xs bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              {isFullWidth ? 'Multi-column' : 'Full width'}
            </Button>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Ask a Question
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] bg-[#1A1C23] border-gray-800">
              <CreateQuestionForm onSuccess={() => {}} />
            </DialogContent>
          </Dialog>
        </div>
      )}
      
      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md mb-4">
          {error}
          <button 
            className="ml-2 text-red-300 hover:text-red-200 underline text-sm"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 bg-[#1A1C23]/50 rounded-lg border border-gray-800">
          <div className="text-gray-400 mb-2">No questions found</div>
          <p className="text-gray-500 text-sm">Be the first to ask a question!</p>
        </div>
      ) : (
        renderQuestions()
      )}
      
      {/* Comment section dialog */}
      {selectedQuestion && (
        <CommentSection
          questionId={selectedQuestion.id}
          isOpen={!!selectedQuestionId}
          onClose={() => {
            setSelectedQuestionId(null);
            setSelectedQuestion(null);
          }}
          question={selectedQuestion}
        />
      )}
    </div>
  );
}
