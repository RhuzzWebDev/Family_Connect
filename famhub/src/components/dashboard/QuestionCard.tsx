"use client"

import { useState } from "react"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { Heart, MessageSquare, Play, Pause, Video } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AnswerForm } from "@/components/answer-form"
import { CommentSection } from "@/components/comment-section"
import { QuestionWithUser } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"

interface QuestionCardProps {
  question: QuestionWithUser;
}

export function QuestionCard({ question }: QuestionCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [liked, setLiked] = useState(false)
  // Ensure we have numbers for the counts
  const [likeCount, setLikeCount] = useState<number>(Number(question.like_count))
  const [commentCount, setCommentCount] = useState<number>(Number(question.comment_count))

  const handleLike = async () => {
    try {
      const newLikeCount = liked ? likeCount - 1 : likeCount + 1
      const { error } = await supabase
        .from('questions')
        .update({ like_count: newLikeCount })
        .eq('id', question.id)

      if (error) throw error

      setLikeCount(newLikeCount)
      setLiked(!liked)
    } catch (error) {
      console.error('Error updating like count:', error)
    }
  }

  const renderMedia = () => {
    if (!question.file_url) return null

    switch (question.media_type) {
      case "image":
        return (
          <div className="relative aspect-video w-full overflow-hidden rounded-md">
            <Image src={question.file_url} alt="Question media" fill className="object-cover" />
          </div>
        )
      case "audio":
        return (
          <div className="flex items-center justify-center rounded-md bg-muted p-4">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
          </div>
        )
      case "video":
        return (
          <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
            <div className="absolute inset-0 flex items-center justify-center">
              <Video className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4">
        <Avatar className="h-8 w-8">
          <AvatarImage src={`/placeholder.svg?text=${question.user.first_name[0]}`} alt={question.user.first_name} />
          <AvatarFallback>{question.user.first_name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm font-medium">{`${question.user.first_name} ${question.user.last_name}`}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
          </p>
          <p className="text-xs text-muted-foreground">{question.user.role} • {question.user.persona}</p>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="mb-3 text-sm">{question.question}</p>
        {renderMedia()}
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="flex items-center gap-1 px-2" onClick={handleLike}>
            <Heart className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
            <span className="text-xs">{likeCount}</span>
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-1 px-2">
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs">{commentCount}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Answers & Comments</DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`/placeholder.svg?text=${question.user.first_name[0]}`} alt={question.user.first_name} />
                      <AvatarFallback>{question.user.first_name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{`${question.user.first_name} ${question.user.last_name}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm">{question.question}</p>
                  {renderMedia()}
                </div>
                <AnswerForm questionId={question.id} />
                <CommentSection questionId={question.id} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">Answer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Answer this question</DialogTitle>
            </DialogHeader>
            <AnswerForm questionId={question.id} />
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  )
}
