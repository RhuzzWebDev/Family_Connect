"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { FileText } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabaseClient"
import { QuestionViewModal } from "./QuestionViewModal"
import { userAnswerQuestions } from '@/services/userAnswerQuestions'
import { useSession } from "next-auth/react"
// Import the utility functions directly to avoid module resolution issues
import { FileText as FileTextIcon, Image as ImageIcon, Music, Video } from "lucide-react"

// Define the getMediaTypeIcon function inline
const getMediaTypeIcon = (mediaType: string | null) => {
  switch (mediaType) {
    case 'image':
      return <ImageIcon className="h-4 w-4" />
    case 'video':
      return <Video className="h-4 w-4" />
    case 'audio':
      return <Music className="h-4 w-4" />
    default:
      return <FileTextIcon className="h-4 w-4" />
  }
}

// Define the formatDate function inline
const formatDate = (date: string) => {
  const dateObj = new Date(date)
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(dateObj)
}

interface Answer {
  answer_format: 'text' | 'number' | 'array' | 'json'
  answer_data: any
  metadata?: Record<string, any>
}

interface Question {
  id: string
  question: string
  media_type: string | null
  type?: string
  file_url?: string | null
  created_at: string
  min_value?: number
  max_value?: number
  step_value?: number
  options?: Array<{ text: string; value: string }>
  answer?: Answer
  user?: {
    id: string
    first_name: string
    last_name: string
    email: string
    role: string
  }
}

interface QuestionSet {
  id: string
  title: string
  description?: string | null
  author_name: string | null
  resource_url?: string | null
  donate_url?: string | null
  cover_image?: string | null
  created_at: string
  updated_at?: string
  question_count?: number
}

interface QuestionSetCardProps {
  questionSet: QuestionSet
}

export function QuestionSetCard({ questionSet }: QuestionSetCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { data: session } = useSession()

  // Fetch questions and their answers
  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('question_set_id', questionSet.id)
        .order('created_at', { ascending: false });

      if (questionsError) throw questionsError;

      if (questionsData) {
        // Fetch answers for all questions
        const { data: answersData, error: answersError } = await userAnswerQuestions.getQuestionSetAnswers(
          questionsData.map(q => q.id)
        );

        if (answersError) throw answersError;
        
        console.log('All answers for these questions:', answersData);
        
        // Get the current user ID from Next.js auth session
        let currentUserId = null;
        
        if (session?.user?.email) {
          console.log('User email from Next.js auth:', session.user.email);
          
          // Get the user ID from the users table using the email
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('id')
              .eq('email', session.user.email)
              .single();
              
            if (userData?.id) {
              currentUserId = userData.id;
              console.log('Got user ID from users table:', currentUserId);
            }
          } catch (error) {
            console.error('Error getting user ID from email:', error);
          }
        }

        // Merge questions with their answers, but only mark as answered if the current user has answered
        const questionsWithAnswers = questionsData.map(question => {
          const allAnswers = answersData?.filter(a => a.question_id === question.id) || [];
          console.log(`Answers for question ${question.id}:`, allAnswers);
          
          // Find an answer from the current user
          const currentUserAnswer = currentUserId ? allAnswers.find(a => {
            const match = a.user_id === currentUserId;
            if (match) {
              console.log(`Found answer for question ${question.id} from current user ${currentUserId}:`, a);
            }
            return match;
          }) : null;
          
          return {
            ...question,
            answer: currentUserAnswer,
            allAnswers: allAnswers
          };
        });

        setQuestions(questionsWithAnswers);
      }
    } catch (err) {
      console.error('Error in fetchQuestions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch questions whenever the component mounts or dialog state changes
    fetchQuestions();
    
    // Refresh questions when dialog opens
    if (isDialogOpen) {
      fetchQuestions();
    }
    
    // Set up a real-time listener for changes to the answers table
    const answersSubscription = supabase
      .channel('answers-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'answers' }, 
        (payload) => {
          console.log('Answers table changed:', payload);
          // Refresh questions when answers are added, updated, or deleted
          fetchQuestions();
        }
      )
      .subscribe();
      
    // Clean up subscription when component unmounts
    return () => {
      supabase.removeChannel(answersSubscription);
    };
  }, [isDialogOpen]);

  return (
    <>
      <Card 
        className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsDialogOpen(true)}
        style={{ background: '#181926', color: '#fff', border: '1px solid #232336' }}
      >
        {/* Cover image if available */}
        {questionSet.cover_image && (
          <div className="w-full h-40 relative">
            <Image
              src={questionSet.cover_image}
              alt={questionSet.title}
              fill
              className="object-cover"
              unoptimized={true}
            />
          </div>
        )}
        
        {/* Content */}
        <CardContent className="p-4">
          <h3 className="text-lg font-medium mb-2 text-white">{questionSet.title}</h3>
          {questionSet.description && (
            <div className="mb-3">
              <p className={`text-sm text-gray-500 ${!showFullDescription ? 'line-clamp-2' : ''}`}>
                {questionSet.description}
              </p>
              {questionSet.description.length > 100 && (
                <button 
                  className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFullDescription(!showFullDescription);
                  }}
                >
                  {showFullDescription ? 'Read Less' : 'Read More'}
                </button>
              )}
            </div>
          )}
          {questionSet.author_name && (
            <p className="text-xs text-gray-500">By {questionSet.author_name}</p>
          )}
        </CardContent>
        
        {/* Footer */}
        <CardFooter className="flex items-center justify-between p-4 pt-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{formatDate(questionSet.created_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500 mr-1" />
            <span className="text-xs text-gray-500">{questionSet.question_count || 0} Questions</span>
          </div>
        </CardFooter>
      </Card>

      {/* Questions Dialog - Slide in from right */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
          <div 
            className={`bg-[#121212] text-white ${isFullscreen ? 'w-full' : 'w-full md:w-1/2'} h-full overflow-hidden flex flex-col animate-slide-in-right`}
            style={{
              boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.2)',
              animation: 'slideInRight 0.3s forwards'
            }}
          >
            <style jsx>{`
              @keyframes slideInRight {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}</style>
            {/* Header with close button */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                  title={isFullscreen ? 'Minimize' : 'Maximize'}
                >
                  {isFullscreen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                    </svg>
                  )}
                </button>
                <h2 className="text-xl font-semibold">{questionSet.title}</h2>
              </div>
              <button 
                onClick={() => setIsDialogOpen(false)}
                className="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            {/* Question set details card */}
            <div className="p-4 border-b border-gray-800">
              {questionSet.cover_image && (
                <div className="w-full h-40 relative mb-4 rounded-lg overflow-hidden">
                  <Image
                    src={questionSet.cover_image}
                    alt={questionSet.title}
                    fill
                    className="object-cover"
                    unoptimized={true}
                  />
                </div>
              )}
              
              <div className="space-y-3">
                {questionSet.description && (
                  <div>
                    <p className={`text-gray-300 ${!showFullDescription ? 'line-clamp-3' : ''}`}>
                      {questionSet.description}
                    </p>
                    {questionSet.description.length > 100 && (
                      <button 
                        className="text-sm text-blue-400 hover:text-blue-300 mt-1"
                        onClick={() => setShowFullDescription(!showFullDescription)}
                      >
                        {showFullDescription ? 'Read Less' : 'Read More'}
                      </button>
                    )}
                  </div>
                )}
                
                {questionSet.author_name && (
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <span className="text-sm text-gray-400">By {questionSet.author_name}</span>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-3 pt-2">
                  {questionSet.resource_url && (
                    <a 
                      href={questionSet.resource_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                      Resources
                    </a>
                  )}
                  
                  {/* Always display donate button, with different styling based on URL availability */}
                  {questionSet.donate_url ? (
                    <a 
                      href={questionSet.donate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-full text-sm transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                      Donate
                    </a>
                  ) : (
                    <button
                      className="flex items-center gap-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm cursor-default"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Could add a toast notification here to inform users that no donation link is available
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                      Donate
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No questions available</p>
                  ) : (
                    questions.map((question) => (
                      <div
                        key={question.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800 cursor-pointer border border-gray-800 transition-colors"
                        onClick={() => setSelectedQuestion(question)}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-3">
                            {getMediaTypeIcon(question.media_type)}
                            <span className="text-gray-200">{question.question}</span>
                          </div>
                          {question.type && (
                            <span className="text-xs text-blue-400 ml-7 mt-1 capitalize">
                              {question.type.replace(/-/g, ' ')} question
                            </span>
                          )}
                        </div>
                        <span 
                          className={`text-sm font-medium px-2 py-1 rounded ${question.answer ? 'text-green-300 bg-green-900/30' : 'text-gray-400 bg-gray-800/50'}`}
                        >
                          {question.answer ? 'Answered' : 'Not Answered'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Question View Modal */}
      {selectedQuestion && (
        <QuestionViewModal 
          question={{
            id: selectedQuestion.id,
            question: selectedQuestion.question,
            media_type: selectedQuestion.media_type,
            file_url: selectedQuestion.file_url,
            created_at: selectedQuestion.created_at,
            type: selectedQuestion.type,
            user: {
              id: '',
              first_name: questionSet.author_name?.split(' ')[0] || 'Unknown',
              last_name: questionSet.author_name?.split(' ')[1] || 'Author',
              email: '',
              role: 'Author'
            }
          }}
          onClose={() => {
            setSelectedQuestion(null);
            fetchQuestions(); // Refresh questions to get updated answers
          }}
          isOpen={true}
        />
      )}
    </>
  );
}
