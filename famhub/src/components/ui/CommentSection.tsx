'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Reply, MoreVertical } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface Comment {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  likes: number;
  replies: Comment[];
  timestamp: string;
}

export function CommentSection({ comments }: { comments: Comment[] }) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const CommentComponent = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const [liked, setLiked] = useState(false);
    const [replyContent, setReplyContent] = useState('');

    return (
      <div className={`${depth > 0 ? 'ml-8' : ''} mb-4`}>
        <div className="flex items-start gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
            <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">{comment.author.name}</span>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm">{comment.content}</p>
            </div>
            <div className="flex gap-4 mt-2 text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLiked(!liked)}
                className={liked ? 'text-red-500' : ''}
              >
                <Heart className="w-4 h-4 mr-1" />
                {comment.likes}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(comment.id)}
              >
                <Reply className="w-4 h-4 mr-1" />
                Reply
              </Button>
              <span className="text-gray-500">{comment.timestamp}</span>
            </div>

            {replyingTo === comment.id && (
              <div className="mt-2">
                <Textarea
                  placeholder="Write a reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-[80px] mb-2"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => {/* Handle reply */}}>
                    Reply
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReplyingTo(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {comment.replies?.map((reply) => (
          <CommentComponent key={reply.id} comment={reply} depth={depth + 1} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentComponent key={comment.id} comment={comment} />
      ))}
    </div>
  );
}
