"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Maximize2, Minimize2, Plus, FileText, ImageIcon, Mic, Video, File, Edit, Trash2, User, Link, Heart, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import CreateQuestionDialog from "@/components/question/create-question-dialog"
import QuestionDetailDialog from "@/components/question/question-detail-dialog"

interface Question {
  id: string
  question: string
  mediaType: "text" | "image" | "audio" | "video" | "file"
  type: string
  createdAt: string
}

interface QuestionSet {
  id: string
  title: string
  description?: string
  author_name?: string
  resource_url?: string
  donate_url?: string
  cover_image?: string
  questionCount: number
  questions: Question[]
}

interface QuestionSetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  questionSet: QuestionSet | null
  onEditQuestion: (questionId: string, updatedQuestion: Partial<Question>) => void
  onDeleteQuestion: (questionId: string) => void
  onAddQuestion: (questionData: any) => void
}

export default function QuestionSetDialog({
  open,
  onOpenChange,
  questionSet,
  onEditQuestion,
  onDeleteQuestion,
  onAddQuestion,
}: QuestionSetDialogProps) {
  const [createQuestionOpen, setCreateQuestionOpen] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [isFullWidth, setIsFullWidth] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Set mounted to true after component mounts to enable animations
    if (open) {
      setMounted(true)
    } else {
      // Reset state when dialog closes
      setTimeout(() => setMounted(false), 300)
    }
  }, [open])

  if (!questionSet) return null

  const handleSaveQuestion = (updatedQuestion: Partial<Question>) => {
    if (selectedQuestion) {
      onEditQuestion(selectedQuestion.id, updatedQuestion)
      setDetailDialogOpen(false)
      setSelectedQuestion(null)
    }
  }

  const handleAddQuestion = (questionData: any) => {
    onAddQuestion({
      ...questionData,
      questionSetId: questionSet.id,
    })
  }

  const getMediaTypeIcon = (mediaType: string) => {
    switch (mediaType) {
      case "text":
        return <FileText className="h-4 w-4" />
      case "image":
        return <ImageIcon className="h-4 w-4" />
      case "audio":
        return <Mic className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      case "file":
        return <File className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date)
  }

  if (!open) return null

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50"
      onClick={() => onOpenChange(false)}
    >
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full ${isFullWidth ? 'md:w-full' : 'md:w-1/2'} bg-black/70 transform transition-all duration-300 ease-in-out ${mounted ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full bg-[#1a1d24] text-white flex flex-col overflow-hidden rounded-l-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white mr-1"
                onClick={() => setIsFullWidth(!isFullWidth)}
              >
                {isFullWidth ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden">
                <FileText className="h-4 w-4" />
              </div>
              <span className="font-medium text-lg">{questionSet.title}</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-400 hover:text-white" 
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-grow overflow-y-auto p-6">
            {/* Cover Image */}
            {questionSet.cover_image && (
              <div className="w-full h-48 mb-6 rounded-lg overflow-hidden">
                <img 
                  src={questionSet.cover_image} 
                  alt={questionSet.title} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* Author Information */}
            <div className="mb-6 space-y-3">
              {questionSet.author_name && (
                <div className="flex items-center text-gray-300">
                  <User className="h-4 w-4 mr-2 text-blue-500" />
                  <span>Author: {questionSet.author_name}</span>
                </div>
              )}
              
              {/* Resource URL */}
              {questionSet.resource_url && (
                <div className="flex items-center mb-2">
                  <Link className="h-4 w-4 mr-2 text-blue-500" />
                  <a 
                    href={questionSet.resource_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Resource <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              )}
              
              {/* Donate URL - Always displayed, but only opens tab if URL exists */}
              <div className="flex items-center mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className={`bg-transparent flex items-center ${questionSet.donate_url ? 'border-pink-700 hover:bg-pink-900/30 text-pink-400' : 'border-gray-700 text-gray-400'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (questionSet.donate_url) {
                      console.log('Opening donate URL:', questionSet.donate_url);
                      window.open(questionSet.donate_url, '_blank');
                    } else {
                      console.log('No donate URL available');
                    }
                  }}
                >
                  <Heart className={`h-4 w-4 mr-2 ${questionSet.donate_url ? 'text-pink-500' : 'text-gray-500'}`} />
                  Support Creator
                </Button>
              </div>
            </div>
            
            {/* Description */}
            {questionSet.description && <p className="text-gray-400 mb-6">{questionSet.description}</p>}

            <div className="flex justify-between items-center mb-6">
              <div className="text-sm text-gray-400">{questionSet.questionCount} Questions</div>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                size="sm"
                onClick={() => setCreateQuestionOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>

            {questionSet.questions.length === 0 ? (
              <div className="bg-[#111318] rounded-lg p-8 text-center">
                <p className="text-gray-400">No questions in this set yet. Add your first question.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {questionSet.questions.map((question) => (
                  <div
                    key={question.id}
                    className="bg-[#111318] rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex justify-between">
                      <div className="flex-1">
                        <p className="text-white">{question.question}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-1 text-sm text-gray-400">
                            {getMediaTypeIcon(question.mediaType)}
                            <span className="capitalize">{question.mediaType}</span>
                          </div>
                          <Badge variant="outline" className="border-gray-700 text-gray-300 bg-gray-800/50">
                            {question.type}
                          </Badge>
                          <span className="text-sm text-gray-500">{formatDate(question.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                          onClick={() => {
                            setSelectedQuestion(question)
                            setDetailDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit Question</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-400"
                          onClick={() => onDeleteQuestion(question.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete Question</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800 text-center text-gray-500 text-sm">
            {questionSet.questionCount} questions in this set
          </div>
        </div>
      </div>

      <CreateQuestionDialog
        open={createQuestionOpen}
        onOpenChange={setCreateQuestionOpen}
        onSubmit={handleAddQuestion}
        questionSetId={questionSet.id}
      />

      {selectedQuestion && (
        <QuestionDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          question={selectedQuestion}
          onSave={handleSaveQuestion}
        />
      )}
    </div>
  )
}
