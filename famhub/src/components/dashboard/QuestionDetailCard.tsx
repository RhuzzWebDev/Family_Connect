"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { 
  FileText, X, Maximize2, Minimize2, 
  ImageIcon, Video, Music, File, 
  Heart, MessageSquare, ExternalLink 
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { CommentSection } from "@/components/comment-section"
import { AnswerForm } from "@/components/answer-form"

interface QuestionTypeData {
  question_id: string;
  option_text?: string;
  option_order?: number;
  min_value?: number;
  max_value?: number;
  step_value?: number;
  default_value?: number;
  image_url?: string;
  answer_format?: string;
  character_limit?: number;
  positive_option?: string;
  negative_option?: string;
  is_row?: boolean;
  content?: string;
  item_order?: number;
  item_text?: string;
}

interface Question {
  id: string;
  question: string;
  media_type: string | null;
  type?: string;
  created_at: string;
  file_url?: string | null;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  typeData?: QuestionTypeData[];
}

interface QuestionDetailCardProps {
  question: Question;
  onClose: (e?: React.MouseEvent) => void;
}

export function QuestionDetailCard({ question, onClose }: QuestionDetailCardProps) {
  const [isFullWidth, setIsFullWidth] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [questionTypeData, setQuestionTypeData] = useState<QuestionTypeData[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setMounted(true);
    fetchQuestionTypeData();
    
    return () => {
      setTimeout(() => setMounted(false), 300);
    };
  }, []);

  const fetchQuestionTypeData = async () => {
    if (!question.id || !question.type) return;
    
    setLoading(true);
    try {
      console.log(`Fetching type data for question: ${question.id}, type: ${question.type}`);
      
      // Determine which table to query based on question type
      let tableName = '';
      switch (question.type) {
        case 'multiple-choice':
        case 'dropdown':
        case 'likert-scale':
          tableName = `question_${question.type.replace('-', '_')}`;
          break;
        case 'rating-scale':
          tableName = 'question_rating_scale';
          break;
        case 'matrix':
          tableName = 'question_matrix';
          break;
        case 'open-ended':
          tableName = 'question_open_ended';
          break;
        case 'image-choice':
          tableName = 'question_image_choice';
          break;
        case 'slider':
          tableName = 'question_slider';
          break;
        case 'dichotomous':
          tableName = 'question_dichotomous';
          break;
        case 'ranking':
          tableName = 'question_ranking';
          break;
        default:
          console.log(`No specific table for question type: ${question.type}`);
          setLoading(false);
          return;
      }
      
      if (tableName) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('question_id', question.id);
          
        if (error) {
          console.error(`Error fetching ${tableName} data:`, error);
        } else {
          console.log(`Fetched ${data?.length || 0} type data items for question`);
          setQuestionTypeData(data || []);
        }
      }
    } catch (err) {
      console.error('Error in fetchQuestionTypeData:', err);
    } finally {
      setLoading(false);
    }
  };

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
        return <ImageIcon className="h-4 w-4" />;
      case "audio":
        return <Music className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "file":
        return <File className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const renderMedia = () => {
    if (!question.file_url || !question.media_type) return null;

    switch (question.media_type) {
      case "video":
        return (
          <div className="relative aspect-video">
            <video
              src={question.file_url}
              controls
              className="rounded-md w-full"
            />
          </div>
        );
      case "audio":
        return (
          <div className="relative">
            <audio
              src={question.file_url}
              controls
              className="w-full rounded-md"
            />
          </div>
        );
      case "image":
        return (
          <div className="relative aspect-video w-full">
            <img
              src={question.file_url}
              alt={question.question}
              className="rounded-md object-contain w-full h-full"
            />
          </div>
        );
      default:
        return null;
    }
  };

  const renderTypeSpecificContent = () => {
    if (!question.type || questionTypeData.length === 0) return null;
    
    switch (question.type) {
      case 'multiple-choice':
      case 'dropdown':
      case 'likert-scale':
        return (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Options:</h3>
            <div className="space-y-2">
              {questionTypeData.map((option, index) => (
                <div 
                  key={index} 
                  className="bg-gray-800 p-2 rounded-md flex items-center"
                >
                  <span className="w-6 h-6 flex items-center justify-center bg-blue-900 rounded-full text-xs mr-2">
                    {option.option_order !== undefined ? option.option_order + 1 : index + 1}
                  </span>
                  <span>{option.option_text}</span>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'rating-scale':
      case 'slider':
        const scaleData = questionTypeData[0];
        return (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Scale Settings:</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-800 p-2 rounded-md">
                <div className="text-xs text-gray-400">Min</div>
                <div>{scaleData?.min_value || 0}</div>
              </div>
              <div className="bg-gray-800 p-2 rounded-md">
                <div className="text-xs text-gray-400">Max</div>
                <div>{scaleData?.max_value || 10}</div>
              </div>
              <div className="bg-gray-800 p-2 rounded-md">
                <div className="text-xs text-gray-400">Step</div>
                <div>{scaleData?.step_value || 1}</div>
              </div>
            </div>
          </div>
        );
        
      case 'matrix':
        const rows = questionTypeData.filter(item => item.is_row);
        const columns = questionTypeData.filter(item => !item.is_row);
        
        return (
          <div className="mt-4 space-y-3">
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">Rows:</h3>
              <div className="space-y-1">
                {rows.map((row, index) => (
                  <div key={index} className="bg-gray-800 p-2 rounded-md">
                    {row.content}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">Columns:</h3>
              <div className="space-y-1">
                {columns.map((col, index) => (
                  <div key={index} className="bg-gray-800 p-2 rounded-md">
                    {col.content}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
        
      case 'image-choice':
        return (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Image Options:</h3>
            <div className="grid grid-cols-2 gap-2">
              {questionTypeData.map((option, index) => (
                <div 
                  key={index} 
                  className="bg-gray-800 p-2 rounded-md"
                >
                  {option.image_url && (
                    <div className="relative h-24 mb-2">
                      <img 
                        src={option.image_url} 
                        alt={option.option_text || `Option ${index + 1}`}
                        className="w-full h-full object-cover rounded-md"
                      />
                    </div>
                  )}
                  <div className="text-sm">{option.option_text}</div>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'open-ended':
        const openEndedData = questionTypeData[0];
        return (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Answer Settings:</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-800 p-2 rounded-md">
                <div className="text-xs text-gray-400">Format</div>
                <div>{openEndedData?.answer_format || 'Text'}</div>
              </div>
              <div className="bg-gray-800 p-2 rounded-md">
                <div className="text-xs text-gray-400">Character Limit</div>
                <div>{openEndedData?.character_limit || 'None'}</div>
              </div>
            </div>
          </div>
        );
        
      case 'dichotomous':
        const dichotomousData = questionTypeData[0];
        return (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Options:</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-800 p-2 rounded-md">
                {dichotomousData?.positive_option || 'Yes'}
              </div>
              <div className="bg-gray-800 p-2 rounded-md">
                {dichotomousData?.negative_option || 'No'}
              </div>
            </div>
          </div>
        );
        
      case 'ranking':
        return (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Items to Rank:</h3>
            <div className="space-y-2">
              {questionTypeData.map((item, index) => (
                <div 
                  key={index} 
                  className="bg-gray-800 p-2 rounded-md flex items-center"
                >
                  <span className="w-6 h-6 flex items-center justify-center bg-blue-900 rounded-full text-xs mr-2">
                    {item.item_order !== undefined ? item.item_order + 1 : index + 1}
                  </span>
                  <span>{item.item_text}</span>
                </div>
              ))}
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/70"
      onClick={(e) => {
        // Only close this modal, not parent components
        e.stopPropagation();
        onClose(e);
      }}
    >
      <div 
        className={`fixed inset-y-0 right-0 z-[101] w-full ${isFullWidth ? 'md:w-full' : 'md:w-1/2'} bg-black/70 transform transition-all duration-300 ease-in-out ${mounted ? 'translate-x-0' : 'translate-x-full'}`}
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
                {getMediaTypeIcon(question.media_type)}
              </div>
              <span className="font-medium text-lg">Question Details</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-400 hover:text-white" 
              onClick={(e) => onClose(e)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-grow overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              {/* Question Type Badge */}
              {question.type && (
                <Badge className="mb-4 bg-blue-900 text-blue-200 border-blue-700">
                  {question.type.replace('-', ' ')}
                </Badge>
              )}
              
              {/* Media if available */}
              {question.file_url && question.media_type && (
                <div className="w-full rounded-md overflow-hidden mb-6">
                  {renderMedia()}
                </div>
              )}
              
              {/* Question text */}
              <h2 className="text-2xl font-semibold mb-4">{question.question}</h2>
              
              {/* Question type specific content */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                renderTypeSpecificContent()
              )}
              
              {/* User info */}
              <div className="flex items-center gap-3 mt-8 p-4 bg-gray-800/50 rounded-lg">
                <div className="h-10 w-10 rounded-full flex items-center justify-center font-semibold bg-blue-900 text-white">
                  {question.user.first_name.charAt(0)}{question.user.last_name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium">
                    {`${question.user.first_name} ${question.user.last_name}`}
                  </div>
                  <div className="text-sm text-gray-400">{question.user.role}</div>
                </div>
                <div className="ml-auto text-sm text-gray-400">
                  {formatDate(question.created_at)}
                </div>
              </div>
              
              {/* Answer form and comments */}
              <div className="mt-8">
                <AnswerForm questionId={question.id} />
                <CommentSection questionId={question.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
