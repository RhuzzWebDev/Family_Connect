'use client';
import { useState } from 'react';
import { QuestionWithUser } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThumbsUp, MessageSquare } from 'lucide-react';
import { SupabaseService } from '@/services/supabaseService';

interface QuestionCardProps {
  question: QuestionWithUser;
}

export function QuestionCard({ question }: QuestionCardProps) {
  const [likeCount, setLikeCount] = useState(question.like_count);
  const [commentCount, setCommentCount] = useState(question.comment_count);
  const [isLiking, setIsLiking] = useState(false);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`;
    if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    return 'Just now';
  };

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      await SupabaseService.updateQuestionLikes(question.id, true);
      setLikeCount(prev => prev + 1);
    } catch (error) {
      console.error('Error liking question:', error);
    } finally {
      setIsLiking(false);
    }
  };

  // If we don't have user data, show a loading state
  if (!question.user) {
    return (
      <Card className="overflow-hidden">
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        {/* User info */}
        <div className="mb-2">
          <p className="text-sm font-medium">
            {question.user?.first_name || 'Anonymous'} {question.user?.last_name || 'User'}
          </p>
        </div>

        {/* Question content */}
        <div className="mb-4">
          <p className="text-lg mb-2">{question.question}</p>
          <p className="text-sm text-muted-foreground">
            {formatTimestamp(question.created_at)}
          </p>
        </div>

        {/* Media preview */}
        {question.file_url && (
          <div className="mb-4 relative rounded-lg overflow-hidden">
            {question.media_type === 'image' ? (
              <img 
                src={question.file_url} 
                alt="Question media" 
                className="w-full h-48 object-cover"
                loading="lazy"
              />
            ) : question.media_type === 'video' ? (
              <video 
                src={question.file_url} 
                controls 
                className="w-full h-48 object-cover"
                preload="metadata"
              />
            ) : question.media_type === 'audio' ? (
              <audio 
                src={question.file_url} 
                controls 
                className="w-full"
                preload="metadata"
              />
            ) : null}
          </div>
        )}

        {/* Interaction buttons */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleLike}
            disabled={isLiking}
          >
            <ThumbsUp className="w-4 h-4" />
            <span>{likeCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{commentCount}</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
