'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CreateQuestionForm from './CreateQuestionForm';
import { format } from 'date-fns';
import { ThumbsUp, MessageSquare, Image as ImageIcon, Video, Music } from 'lucide-react';
import Image from 'next/image';

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
  };
}

export default function QuestionGrid() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`*, user:users!questions_user_id_fkey (first_name, last_name, role, persona)`)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setQuestions(data || []);
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();

    // Subscribe to new questions
    const channel = supabase
      .channel('questions-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => {
        fetchQuestions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  if (loading) {
    return <div className="text-center py-8">Loading questions...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Family Feed</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-gray-600 hover:bg-gray-700 text-white">Ask Question</Button>
          </DialogTrigger>
          <DialogContent className="bg-white sm:max-w-[600px] p-0">
            <DialogHeader className="pt-8 px-6 pb-4 border-b">
              <DialogTitle className="text-lg font-semibold text-center">Ask a Question</DialogTitle>
            </DialogHeader>
            <div className="p-6">
              <CreateQuestionForm onQuestionCreated={fetchQuestions} type="question" />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No questions yet. Be the first to ask!</div>
      ) : (
        <div className="grid grid-rows-3 grid-cols-3 gap-6">
          {questions.map((question) => (
            <div key={question.id} className="bg-white rounded-lg shadow-sm p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {getInitials(question.user.first_name, question.user.last_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">
                        {question.user.first_name} {question.user.last_name}
                      </h3>
                      <p className="text-sm text-gray-500">{question.user.role}</p>
                    </div>
                    <time className="text-sm text-gray-500">
                      {format(new Date(question.created_at), 'MMM d, yyyy')}
                    </time>
                  </div>
                  <p className="mt-2 text-gray-700">{question.question}</p>
                  {question.file_url && (
                    <div className="mt-4">
                      <MediaPreview type={question.media_type} url={question.file_url} />
                    </div>
                  )}
                  <div className="mt-4 flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-blue-600"
                      onClick={() => handleLike(question.id)}
                    >
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      {question.like_count}
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-600 hover:text-blue-600"
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Answer
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white sm:max-w-[600px] p-0">
                        <DialogHeader className="pt-8 px-6 pb-4 border-b">
                          <DialogTitle className="text-lg font-semibold text-center">Post an Answer</DialogTitle>
                        </DialogHeader>
                        <div className="p-6">
                          <CreateQuestionForm onQuestionCreated={fetchQuestions} type="answer" />
                        </div>
                      </DialogContent>
                    </Dialog>
                    {question.file_url && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <MediaTypeIcon type={question.media_type} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
