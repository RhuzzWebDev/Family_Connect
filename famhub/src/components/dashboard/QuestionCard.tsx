"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { Heart, MessageSquare, Play, Pause, Video } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AnswerForm } from "@/components/answer-form"
import { CommentSection } from "@/components/comment-section"
import { QuestionDetailCard } from "./QuestionDetailCard"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { RealtimeChannel } from '@supabase/supabase-js'

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface DatabaseQuestion {
  id: string;
  question: string;
  media_type?: "image" | "video" | "audio" | null;
  file_url?: string | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  type?: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
}

interface QuestionCardProps {
  question: DatabaseQuestion;
}

export function QuestionCard({ question }: QuestionCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(question.like_count)
  const [commentCount, setCommentCount] = useState(question.comment_count)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [showDetailCard, setShowDetailCard] = useState(false)
  const userEmail = sessionStorage.getItem('userEmail')

  useEffect(() => {
    const checkIfLiked = async () => {
      if (!userEmail) return;

      try {
        // Check if user has liked this question
        const { data: likes, error } = await supabase
          .from('question_likes')
          .select('id')
          .eq('question_id', question.id)
          .eq('user_email', userEmail)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is the "not found" error code
          console.error('Error checking like status:', error);
          return;
        }

        setLiked(!!likes);

        // Get updated like count
        const { data: updatedQuestion, error: countError } = await supabase
          .from('questions')
          .select<'like_count,comment_count', { like_count: number; comment_count: number }>('like_count,comment_count')
          .eq('id', question.id)
          .single();

        if (countError) {
          console.error('Error fetching updated counts:', countError);
          return;
        }

        if (updatedQuestion) {
          setLikeCount(updatedQuestion.like_count);
          setCommentCount(updatedQuestion.comment_count);
        }
      } catch (error) {
        console.error('Error in checkIfLiked:', error);
      }
    };

    checkIfLiked();
  }, [question.id, userEmail]);

  useEffect(() => {
    // Subscribe to real-time updates for this question
    const channel = supabase.channel(`question:${question.id}`);
    
    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'questions',
          filter: `id=eq.${question.id}`
        },
        (payload) => {
          const updatedQuestion = payload.new as DatabaseQuestion;
          if (updatedQuestion) {
            setLikeCount(updatedQuestion.like_count);
            setCommentCount(updatedQuestion.comment_count);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [question.id]);

  const handleLike = async () => {
    if (!userEmail || isLikeLoading) return;

    try {
      setIsLikeLoading(true);
      
      // Optimistic UI update
      const newLikeCount = liked ? likeCount - 1 : likeCount + 1;
      setLikeCount(newLikeCount);
      setLiked(!liked);

      if (liked) {
        // Unlike: Remove the like record
        const { error: deleteError } = await supabase
          .from('question_likes')
          .delete()
          .eq('question_id', question.id)
          .eq('user_email', userEmail);

        if (deleteError) {
          console.error('Error removing like:', deleteError);
          // Revert optimistic update on error
          setLikeCount(likeCount);
          setLiked(liked);
          setIsLikeLoading(false);
          return;
        }
      } else {
        // Like: Add a new like record
        const { error: insertError } = await supabase
          .from('question_likes')
          .insert({
            question_id: question.id,
            user_email: userEmail
          });

        if (insertError) {
          console.error('Error adding like:', insertError);
          // Revert optimistic update on error
          setLikeCount(likeCount);
          setLiked(liked);
          setIsLikeLoading(false);
          return;
        }
      }

      // Update the question's like_count
      const { error: updateError } = await supabase
        .from('questions')
        .update({ like_count: newLikeCount })
        .eq('id', question.id);

      if (updateError) {
        console.error('Error updating like count:', updateError);
        // We don't revert here since the like/unlike operation succeeded
        // Only the count update failed
      }
      
      setIsLikeLoading(false);
    } catch (error) {
      console.error('Error handling like:', error);
      // Revert optimistic update on unexpected error
      setLikeCount(likeCount);
      setLiked(liked);
      setIsLikeLoading(false);
    }
  };

  const renderMedia = () => {
    if (!question.file_url || !question.media_type) return null;

    switch (question.media_type) {
      case "video":
        return (
          <div className="relative aspect-video">
            <video
              src={question.file_url}
              controls
              className="rounded-md"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        );
      case "audio":
        return (
          <div className="relative">
            <audio
              src={question.file_url}
              controls
              className="w-full rounded-md"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        );
      case "image":
        return (
          <div className="relative aspect-square">
            <img
              src={question.file_url}
              alt={question.question}
              className="rounded-md object-cover"
            />
          </div>
        );
      default:
        return null;
    }
  };

  const renderCommentSection = () => (
    <div className="mt-4 space-y-4">
      <div className="space-y-4">
        {/* Media at the top if available */}
        {question.file_url && question.media_type && (
          <div className="w-full rounded-md overflow-hidden">
            {renderMedia()}
          </div>
        )}
        
        {/* Question text */}
        <p className="text-base font-medium">{question.question}</p>
        
        {/* User info at the bottom */}
        <div className="flex items-center gap-2 pt-3">
          <div className="h-6 w-6 rounded-full flex items-center justify-center font-semibold" style={{ background: '#0F1017', color: '#60a5fa' }}>
            {`${question.user.first_name[0]}${question.user.last_name[0]}`}
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
      </div>
      <AnswerForm questionId={question.id} />
      <CommentSection questionId={question.id} />
    </div>
  );

  return (
    <>
      <Card 
        className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" 
        onClick={() => setShowDetailCard(true)}
      >
        {/* Media at the top if available */}
        {question.file_url && question.media_type && (
          <div className="w-full">
            {renderMedia()}
          </div>
        )}
        
        {/* Question content in the middle */}
        <CardContent className="p-4">
          <div className="relative">
            <div className="pulse-hint absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <p className="text-base font-medium">{question.question}</p>
          </div>
          
          {/* Question type badge if available */}
          {question.type && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {question.type.replace('-', ' ')}
              </span>
            </div>
          )}
        </CardContent>
        
        {/* User info and actions in the footer */}
        <CardFooter className="flex items-center justify-between p-4 pt-0">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full flex items-center justify-center font-semibold" style={{ background: '#0F1017', color: '#60a5fa' }}>
              {`${question.user.first_name[0]}${question.user.last_name[0]}`}
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
              className={cn("h-8 w-8 p-0 relative z-10", { "text-red-500": liked })}
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click event
                handleLike();
              }}
              disabled={isLikeLoading}
            >
              <Heart className={cn("h-4 w-4", { "fill-current text-red-500": liked })} />
              <span className="sr-only">Like</span>
            </Button>
            <span className="text-xs">{likeCount.toString()}</span>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 relative z-10"
                  onClick={(e) => e.stopPropagation()} // Prevent card click event
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="sr-only">Comment</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Answers & Comments</DialogTitle>
                </DialogHeader>
                {renderCommentSection()}
              </DialogContent>
            </Dialog>
            <span className="text-xs">{commentCount.toString()}</span>
          </div>
        </CardFooter>
      </Card>
      
      {/* Question Detail Card */}
      {showDetailCard && (
        <QuestionDetailCard 
          question={{
            ...question,
            media_type: question.media_type || null,
            file_url: question.file_url || null
          }} 
          onClose={() => setShowDetailCard(false)} 
        />
      )}
    </>
  );
}
