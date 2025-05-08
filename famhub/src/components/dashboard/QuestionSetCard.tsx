"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { Heart, MessageSquare, FileText, User, Link, ExternalLink, Plus, X, Maximize2, Minimize2, Eye, Edit, Trash2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { QuestionViewModal } from "./QuestionViewModal"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface Question {
  id: string;
  question: string;
  media_type: string | null;
  type: string;
  created_at: string;
  file_url?: string | null;
}

interface QuestionSet {
  id: string;
  title: string;
  description: string | null;
  author_name: string | null;
  resource_url: string | null;
  donate_url: string | null;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
  question_count?: number;
}

interface QuestionSetCardProps {
  questionSet: QuestionSet;
}

export function QuestionSetCard({ questionSet }: QuestionSetCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [isFullWidth, setIsFullWidth] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)

  // Fetch questions for this question set when dialog opens
  const fetchQuestions = async () => {
    if (!isDialogOpen) return;
    
    setLoading(true);
    try {
      console.log(`Fetching questions for question set: ${questionSet.id}`);
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('question_set_id', questionSet.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching questions:', error);
        return;
      }
      
      console.log(`Found ${data?.length || 0} questions for this set`);
      setQuestions(data || []);
    } catch (err) {
      console.error('Error in fetchQuestions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    
    // Set mounted to true after component mounts to enable animations
    if (isDialogOpen) {
      setMounted(true);
    } else {
      // Reset state when dialog closes
      setTimeout(() => setMounted(false), 300);
    }
  }, [isDialogOpen]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const getMediaTypeIcon = (mediaType: string | null) => {
    switch (mediaType) {
      case "text":
        return <FileText className="h-4 w-4" />;
      case "image":
        return <Image width={16} height={16} src="/icons/image.svg" alt="Image" />;
      case "audio":
        return <Image width={16} height={16} src="/icons/audio.svg" alt="Audio" />;
      case "video":
        return <Image width={16} height={16} src="/icons/video.svg" alt="Video" />;
      case "file":
        return <Image width={16} height={16} src="/icons/file.svg" alt="File" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Card 
        className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        style={{ background: '#181926', color: '#fff', border: '1px solid #232336' }}
        onClick={() => setIsDialogOpen(true)}
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
          <h3 className="text-lg font-medium text-blue-400 mb-2">{questionSet.title}</h3>
          {questionSet.description && (
            <p className="text-sm text-gray-300 mb-3 line-clamp-2">{questionSet.description}</p>
          )}
          {questionSet.author_name && (
            <p className="text-xs text-gray-400">By {questionSet.author_name}</p>
          )}
        </CardContent>
        
        {/* Footer */}
        <CardFooter className="flex items-center justify-between p-4 pt-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(questionSet.created_at), { addSuffix: true })}
            </span>
            
            {/* Question count badge */}
            <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full">
              {questionSet.question_count || 0} question{(questionSet.question_count !== 1) ? 's' : ''}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {questionSet.resource_url && (
              <a 
                href={questionSet.resource_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded-full hover:bg-blue-800"
                onClick={(e) => e.stopPropagation()}
              >
                Resource
              </a>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Question Set Dialog */}
      {isDialogOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => {
            // Only close if no question is selected
            if (!selectedQuestion) {
              setIsDialogOpen(false);
            }
          }}
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
                  onClick={() => setIsDialogOpen(false)}
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
                        // Add null check before passing to window.open
                        if (questionSet.donate_url) {
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
                  <div className="text-sm text-gray-400">{questionSet.question_count || questions.length} Questions</div>
                </div>

                {/* Questions List */}
                {loading ? (
                  <div className="bg-[#111318] rounded-lg p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-400 mt-4">Loading questions...</p>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="bg-[#111318] rounded-lg p-8 text-center">
                    <p className="text-gray-400">No questions in this set yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {questions.map((question) => (
                      <div
                        key={question.id}
                        className="bg-[#111318] rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent dialog from closing
                          setSelectedQuestion(question);
                        }}
                        data-component-name="QuestionSetCard"
                      >
                        <div className="flex justify-between">
                          <div className="flex-1" data-component-name="QuestionSetCard">
                            <p className="text-white" data-component-name="QuestionSetCard">{question.question}</p>
                            <div className="flex items-center gap-4 mt-3" data-component-name="QuestionSetCard">
                              {question.media_type && (
                                <div className="flex items-center gap-1 text-sm text-gray-400">
                                  {getMediaTypeIcon(question.media_type)}
                                  <span className="capitalize">{question.media_type}</span>
                                </div>
                              )}
                              {question.type && (
                                <Badge variant="outline" className="border-gray-700 text-gray-300 bg-gray-800/50">
                                  {question.type}
                                </Badge>
                              )}
                              <span className="text-sm text-gray-500">{formatDate(question.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-blue-400 relative z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedQuestion(question);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Question View Modal */}
      <QuestionViewModal 
        question={{
          ...selectedQuestion || { id: '', question: '', created_at: '', media_type: null },
          media_type: selectedQuestion?.media_type || null,
          file_url: selectedQuestion?.file_url || null,
          user: {
            id: '',
            first_name: questionSet.author_name?.split(' ')[0] || 'Unknown',
            last_name: questionSet.author_name?.split(' ')[1] || 'Author',
            email: '',
            role: 'Author'
          }
        }}
        onClose={() => setSelectedQuestion(null)}
        isOpen={!!selectedQuestion}
      />
    </>
  );
}
