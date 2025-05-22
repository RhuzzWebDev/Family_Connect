"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Maximize2, Minimize2, Plus, FileText, ImageIcon, Mic, Video, File, Edit, Trash2, User, Link, Heart, ExternalLink, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format, formatDistanceToNow } from "date-fns"
import CreateQuestionDialog from "@/components/question/create-question-dialog"
import QuestionDetailDialog from "@/components/question/question-detail-dialog"
import QuestionViewDialog from "@/components/question/question-view-dialog"
import { adminQuestionServices } from '@/services/AdminQuestionServices'
import { QuestionTypeData } from '@/types/question'
import { supabase } from "@/lib/supabaseClient"

interface Question {
  id: string
  question: string
  mediaType: "text" | "image" | "audio" | "video" | "file"
  type: string
  createdAt: string
  answers?: UserAnswer[]
}

interface UserData {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  role?: string
}

interface UserAnswer {
  user: UserData
  answer_data: any
  created_at: string
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
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewQuestionSet, setViewQuestionSet] = useState<QuestionSet | null>(null)
  const [isFullWidth, setIsFullWidth] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer[]>>({})
  const [currentUserAnsweredQuestions, setCurrentUserAnsweredQuestions] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Set mounted to true after component mounts to enable animations
    if (open) {
      setMounted(true)
      
      // Try to get the user ID from session storage or auth session
      if (!sessionStorage.getItem('userId')) {
        const getUserId = async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user?.id) {
              sessionStorage.setItem('userId', session.user.id)
            }
          } catch (error) {
            console.error('Error getting user session:', error)
          }
        }
        getUserId()
      }
      
      // Fetch answers for each question when dialog opens
      if (questionSet && questionSet.questions && questionSet.questions.length > 0) {
        fetchAnswersForQuestions(questionSet.questions)
      }
    } else {
      // Reset state when dialog closes
      setTimeout(() => setMounted(false), 300)
    }
  }, [open, questionSet?.id])
  
  // Fetch answers for all questions in the set
  const fetchAnswersForQuestions = async (questions: Question[]) => {
    try {
      // Get admin email from session storage (or use a default for demo)
      const adminEmail = sessionStorage.getItem('adminEmail') || 'admin@example.com'
      // Get current user ID from session storage
      const currentUserId = sessionStorage.getItem('userId')
      
      // Create a map to store answers by question ID
      const answersMap: Record<string, UserAnswer[]> = {}
      
      // Fetch answers for each question
      for (const question of questions) {
        // @ts-ignore - adminQuestionServices.getQuestionAnswers exists but TypeScript doesn't recognize it
        const { data, error } = await adminQuestionServices.getQuestionAnswers(question.id, adminEmail)
        
        if (error) {
          console.error(`Error fetching answers for question ${question.id}:`, error)
          continue
        }
        
        if (data && data.length > 0) {
          // Format the answers with user data
          const formattedAnswers: UserAnswer[] = data.map((answer: any) => ({
            user: {
              id: answer.user_id,
              first_name: answer.users?.first_name || '',
              last_name: answer.users?.last_name || '',
              email: answer.users?.email || '',
              role: answer.users?.role || ''
            },
            answer_data: answer.answer_data,
            created_at: answer.created_at
          }))
          
          // Store in the map
          answersMap[question.id] = formattedAnswers
        }
      }
      
      // Update state with all answers
      setUserAnswers(answersMap)

      // Store which questions the current user has answered
      const userAnsweredQuestions = new Set<string>()
      Object.entries(answersMap).forEach(([questionId, answers]) => {
        // Check if any of the answers are from the current user
        if (answers.some(answer => answer.user.id === currentUserId)) {
          userAnsweredQuestions.add(questionId)
        }
      })
      setCurrentUserAnsweredQuestions(userAnsweredQuestions)
    } catch (err) {
      console.error('Error fetching answers:', err)
    }
  }

  if (!questionSet) return null

  const handleSaveQuestion = (updatedQuestion: Partial<Question>) => {
    if (selectedQuestion) {
      onEditQuestion(selectedQuestion.id, updatedQuestion)
      setDetailDialogOpen(false)
      setSelectedQuestion(null)
    }
  }

  const handleAddQuestion = (questionData: any) => {
    console.log('Question data in dialog:', questionData); // Debug log
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
              <div className="bg-[#181926] rounded-lg p-8 text-center border border-gray-800">
                <p className="text-gray-400">No questions in this set yet. Add your first question.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {questionSet.questions.map((question) => (
                  <div
                    key={question.id}
                    className="bg-[#181926] rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors relative"
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
                          {currentUserAnsweredQuestions.has(question.id) && (
                            <span className="text-sm text-green-300 font-medium px-2 py-1 bg-green-900/30 rounded">Answered</span>
                          )}
                        </div>
                        
                        {/* Display latest answer per family member */}
                        {userAnswers[question.id] && userAnswers[question.id].length > 0 && (
                          <div className="mt-4 pt-3 border-t border-gray-800">
                            <h4 className="text-sm font-medium text-gray-300 mb-2">Latest Family Responses:</h4>
                            <div className="space-y-2">
                              {/* Create a map to only keep the latest answer per user */}
                              {(() => {
                                const latestAnswerByUser = new Map()
                                userAnswers[question.id].forEach((answer: UserAnswer) => {
                                  if (!latestAnswerByUser.has(answer.user.id) || 
                                      new Date(answer.created_at) > new Date(latestAnswerByUser.get(answer.user.id).created_at)) {
                                    latestAnswerByUser.set(answer.user.id, answer)
                                  }
                                })
                                
                                return Array.from(latestAnswerByUser.values()).map((answer, idx) => (
                                  <div key={idx} className="flex items-start gap-2 p-2 rounded-md bg-[#1a1d24] border border-gray-800">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-900 flex items-center justify-center text-xs text-white">
                                      {answer.user.first_name?.[0] || answer.user.email?.[0] || '?'}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex justify-between items-start">
                                        <p className="text-sm font-medium text-gray-200">
                                          {answer.user.first_name} {answer.user.last_name}
                                          <span className="ml-2 text-xs text-gray-500">{answer.user.role}</span>
                                        </p>
                                        <span className="text-xs text-gray-500">
                                          {formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-400 mt-1">
                                        {typeof answer.answer_data === 'string' ? answer.answer_data : 
                                         Array.isArray(answer.answer_data) ? answer.answer_data.join(', ') : 
                                         JSON.stringify(answer.answer_data)}
                                      </p>
                                    </div>
                                  </div>
                                ))
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-blue-400"
                          onClick={async () => {
                            try {
                              // Get admin email from session storage (or use a default for demo)
                              const adminEmail = sessionStorage.getItem('adminEmail') || 'admin@example.com';
                              
                              console.log(`Fetching question data for ID: ${question.id}`);
                              // Fetch the full question data with type-specific details
                              const questionData = await adminQuestionServices.getQuestionWithTypeData(question.id, adminEmail);
                              console.log('Fetched question data:', questionData);
                              
                              // Create a temporary question set with the enhanced question data
                              const enhancedQuestion = {
                                id: question.id,
                                question: question.question,
                                mediaType: question.mediaType || questionData.media_type,
                                media_type: question.mediaType || questionData.media_type,
                                type: question.type,
                                createdAt: question.createdAt,
                                file_url: questionData.file_url,
                                // Add type-specific data from the fetched data
                                typeData: [] as QuestionTypeData[]
                              };
                              
                              // Add the appropriate type data based on question type
                              switch(question.type) {
                                case 'multiple-choice':
                                case 'dropdown':
                                case 'likert-scale':
                                case 'ranking':
                                  if (questionData.options && questionData.options.length > 0) {
                                    console.log(`Processing ${questionData.options.length} options for ${question.type}`);
                                    enhancedQuestion.typeData = questionData.options.map(option => ({
                                      question_id: option.question_id,
                                      option_text: option.option_text,
                                      option_order: option.option_order,
                                      item_text: option.option_text // For ranking compatibility
                                    }));
                                  }
                                  break;
                                  
                                case 'image-choice':
                                  if (questionData.imageOptions && questionData.imageOptions.length > 0) {
                                    console.log(`Processing ${questionData.imageOptions.length} image options`);
                                    enhancedQuestion.typeData = questionData.imageOptions.map(option => ({
                                      question_id: option.question_id,
                                      option_text: option.option_text,
                                      option_order: option.option_order,
                                      image_url: option.image_url
                                    }));
                                  }
                                  break;
                                  
                                case 'rating-scale':
                                case 'slider':
                                  if (questionData.scale) {
                                    console.log('Processing scale data:', questionData.scale);
                                    const scaleData: QuestionTypeData = {
                                      question_id: questionData.scale.question_id,
                                      min_value: questionData.scale.min_value,
                                      max_value: questionData.scale.max_value,
                                      step_value: questionData.scale.step_value,
                                      default_value: questionData.scale.default_value
                                    };
                                    enhancedQuestion.typeData = [scaleData];
                                  }
                                  break;
                                  
                                case 'matrix':
                                  if (questionData.matrix) {
                                    console.log(`Processing matrix with ${questionData.matrix.rows.length} rows and ${questionData.matrix.columns.length} columns`);
                                    const matrixItems: QuestionTypeData[] = [];
                                    
                                    // Add rows
                                    questionData.matrix.rows.forEach(row => {
                                      matrixItems.push({
                                        question_id: row.question_id,
                                        is_row: true,
                                        content: row.content,
                                        item_order: row.item_order
                                      });
                                    });
                                    
                                    // Add columns
                                    questionData.matrix.columns.forEach(col => {
                                      matrixItems.push({
                                        question_id: col.question_id,
                                        is_row: false,
                                        content: col.content,
                                        item_order: col.item_order
                                      });
                                    });
                                    
                                    enhancedQuestion.typeData = matrixItems;
                                  }
                                  break;
                                  
                                case 'open-ended':
                                  if (questionData.openEndedSettings) {
                                    console.log('Processing open-ended settings:', questionData.openEndedSettings);
                                    enhancedQuestion.typeData = [{
                                      question_id: question.id,
                                      answer_format: questionData.openEndedSettings.answer_format,
                                      character_limit: questionData.openEndedSettings.character_limit
                                    }];
                                  }
                                  break;
                                  
                                case 'dichotomous':
                                  if (questionData.options && questionData.options.length > 0) {
                                    console.log('Processing dichotomous options');
                                    // For dichotomous questions, we might have the data in options
                                    enhancedQuestion.typeData = questionData.options.map(option => ({
                                      question_id: option.question_id,
                                      option_text: option.option_text,
                                      option_order: option.option_order,
                                      positive_option: option.option_order === 0 ? option.option_text : undefined,
                                      negative_option: option.option_order === 1 ? option.option_text : undefined
                                    }));
                                  }
                                  break;
                                  
                                default:
                                  console.log(`No specific handling for question type: ${question.type}`);
                                  break;
                              }
                              
                              const singleQuestionSet = {
                                id: 'single-question-' + question.id,
                                title: question.question,
                                description: '',
                                questionCount: 1,
                                questions: [enhancedQuestion]
                              };
                              
                              // Set the question set to view and open the dialog
                              setViewQuestionSet(singleQuestionSet);
                              setViewDialogOpen(true);
                            } catch (error) {
                              console.error('Error fetching question data:', error);
                              // Fallback to basic question data if fetch fails
                              const singleQuestionSet = {
                                id: 'single-question-' + question.id,
                                title: question.question,
                                description: '',
                                questionCount: 1,
                                questions: [question]
                              };
                              setViewQuestionSet(singleQuestionSet);
                              setViewDialogOpen(true);
                            }
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View Question</span>
                        </Button>
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

      <QuestionViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        questionSet={viewQuestionSet}
      />
    </div>
  )
}
