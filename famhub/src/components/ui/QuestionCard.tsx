'use client';

import { useState, useEffect, useRef } from "react"
import Image, { StaticImageData } from "next/image"
import { formatDistanceToNow } from "date-fns"
import { Heart, MessageSquare, Play, Pause } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AnswerForm } from "@/components/answer-form"
import { CommentSection } from "@/components/comment-section"
import { AirtableService } from "@/services/airtableService"
import { QuestionFields } from "@/services/airtableService"

interface QuestionCardProps {
  questionId: string;
  onUpdate?: () => void;
}

interface NormalizedQuestion {
  id: string;
  user_id: string;
  questions: string;
  file_url: string;
  like_count: number;
  comment_count: number;
  Timestamp: string;
  mediaType?: 'image' | 'video' | 'audio';
  folder_path?: string;
}

export function QuestionCard({ questionId, onUpdate }: QuestionCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [liked, setLiked] = useState(false)
  const [question, setQuestion] = useState<NormalizedQuestion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const airtableService = new AirtableService()

  const normalizeQuestion = (questionData: QuestionFields): NormalizedQuestion => ({
    id: String(questionData.id),
    user_id: String(questionData.user_id),
    questions: String(questionData.questions),
    file_url: String(questionData.file_url || ''),
    like_count: Number(questionData.like_count) || 0,
    comment_count: Number(questionData.comment_count) || 0,
    Timestamp: String(questionData.Timestamp),
    mediaType: questionData.mediaType,
    folder_path: questionData.folder_path
  })

  const fetchQuestion = async () => {
    try {
      const records = await airtableService.getQuestions(`id = "${questionId}"`)
      if (records && records.length > 0) {
        const questionData = records[0].fields as QuestionFields;
        setQuestion(normalizeQuestion(questionData))
        setError(null)
      } else {
        setError("Question not found")
      }
    } catch (err) {
      setError("Failed to load question")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuestion()
    // Set up polling for real-time updates
    const interval = setInterval(fetchQuestion, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [questionId])

  const handleLike = async () => {
    if (!question) return

    const newLikeCount = liked ? question.like_count - 1 : question.like_count + 1

    try {
      await airtableService.updateQuestionLikes(questionId, newLikeCount)
      setQuestion(prev => {
        if (!prev) return null;
        return {
          ...prev,
          like_count: newLikeCount
        };
      });
      setLiked(!liked)
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error("Failed to update likes:", err)
    }
  }

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }
  }

  const getMediaUrl = (url: string): string => {
    return url.startsWith('/') ? url : `/${url}`
  }

  const renderMedia = () => {
    if (!question?.file_url) return null

    const mediaUrl = getMediaUrl(question.file_url)

    switch (question.mediaType) {
      case "image":
        return (
          <div className="relative aspect-video w-full overflow-hidden rounded-md">
            <Image 
              src={mediaUrl as string | StaticImageData}
              alt="Question media" 
              fill 
              className="object-cover" 
            />
          </div>
        )
      case "audio":
        return (
          <div className="flex items-center justify-center rounded-md bg-muted p-4">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={handlePlayPause}
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
            <audio
              ref={audioRef}
              src={mediaUrl}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>
        )
      case "video":
        return (
          <div className="relative aspect-video w-full overflow-hidden rounded-md">
            <video 
              src={mediaUrl}
              controls 
              className="h-full w-full object-cover"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )
      default:
        return null
    }
  }

  if (loading) {
    return <div className="animate-pulse"><div className="h-48 bg-muted rounded-lg"></div></div>
  }

  if (error || !question) {
    return <div className="text-red-500 p-4 text-center">{error || "Question not found"}</div>
  }

  const timestamp = new Date(question.Timestamp)
  const formattedTimestamp = formatDistanceToNow(timestamp, { addSuffix: true })

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4">
        <Avatar className="h-8 w-8">
          <AvatarImage src="/placeholder-avatar.png" alt="User" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm font-medium">User {question.user_id}</p>
          <p className="text-xs text-muted-foreground">{formattedTimestamp}</p>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="mb-3 text-sm">{question.questions}</p>
        {renderMedia()}
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="flex items-center gap-1 px-2" onClick={handleLike}>
            <Heart className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
            <span className="text-xs">{question.like_count}</span>
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-1 px-2">
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs">{question.comment_count}</span>
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
                      <AvatarImage src="/placeholder-avatar.png" alt="User" />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">User {question.user_id}</p>
                      <p className="text-xs text-muted-foreground">{formattedTimestamp}</p>
                    </div>
                  </div>
                  <p className="text-sm">{question.questions}</p>
                  {renderMedia()}
                </div>
                <AnswerForm questionId={questionId} />
                <CommentSection questionId={questionId} />
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
            <AnswerForm questionId={questionId} />
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  )
}
