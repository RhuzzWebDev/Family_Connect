'use client';

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

interface QuestionCardProps {
  question: {
    id: number
    text: string
    author: {
      name: string
      avatar: string
    }
    mediaType: 'image' | 'video' | 'audio'
    mediaUrl: string | null
    likes: number
    comments: number
    createdAt: string
  }
}

export function QuestionCard({ question }: QuestionCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(question.likes)
  const [showComments, setShowComments] = useState(false)

  const handleLike = () => {
    if (liked) {
      setLikeCount(likeCount - 1)
    } else {
      setLikeCount(likeCount + 1)
    }
    setLiked(!liked)
  }

  const renderMedia = () => {
    if (!question.mediaUrl) return null

    switch (question.mediaType) {
      case "image":
        return (
          <div className="relative aspect-video w-full overflow-hidden rounded-md">
            <Image src={question.mediaUrl || "/placeholder.svg"} alt="Question media" fill className="object-cover" />
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
          <AvatarImage src={question.author.avatar} alt={question.author.name} />
          <AvatarFallback>{question.author.name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm font-medium">{question.author.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(question.createdAt), { addSuffix: true })}
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="mb-3 text-sm">{question.text}</p>
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
                <span className="text-xs">{question.comments}</span>
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
                      <AvatarImage src={question.author.avatar} alt={question.author.name} />
                      <AvatarFallback>{question.author.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{question.author.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(question.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm">{question.text}</p>
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
