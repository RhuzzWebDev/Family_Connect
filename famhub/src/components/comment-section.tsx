'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface CommentSectionProps {
  questionId: number
}

export function CommentSection({ questionId }: CommentSectionProps) {
  // Mock comments data
  const comments = [
    {
      id: 1,
      text: "This is a wonderful memory!",
      author: {
        name: "John Doe",
        avatar: "/avatars/member1.jpg"
      },
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      text: "I remember this day so clearly.",
      author: {
        name: "Jane Smith",
        avatar: "/avatars/member2.jpg"
      },
      createdAt: new Date().toISOString()
    }
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar className="h-6 w-6">
              <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
              <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{comment.author.name}</span>
                <span className="text-xs text-muted-foreground">Just now</span>
              </div>
              <p className="text-sm">{comment.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea placeholder="Write a comment..." className="min-h-[60px]" />
        <Button className="self-end">Post</Button>
      </div>
    </div>
  )
}
