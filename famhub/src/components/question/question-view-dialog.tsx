"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Maximize2, Minimize2, FileText, ImageIcon, Mic, Video, File, Eye, ExternalLink, Database } from "lucide-react"
import { Badge } from "@/components/ui/badge";

// Human-friendly labels for question types
const typeLabels: Record<string, string> = {
  "multiple-choice": "Multiple Choice",
  "text": "Text",
  "rating-scale": "Rating Scale",
  "likert-scale": "Likert Scale",
  "matrix": "Matrix",
  "dropdown": "Dropdown",
  "open-ended": "Open Ended",
  "image-choice": "Image Choice",
  "slider": "Slider",
  "dichotomous": "Dichotomous",
  "ranking": "Ranking",
};

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Question, QuestionSet, QuestionTypeData } from "@/types/question"
import { adminQuestionServices, QuestionTypeEnum } from '@/services/AdminQuestionServices'

interface QuestionViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionSet: QuestionSet | null;
}

export default function QuestionViewDialog({
  open,
  onOpenChange,
  questionSet,
}: QuestionViewDialogProps) {
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [loadingTypeData, setLoadingTypeData] = useState<Record<string, boolean>>({});
  const [typeSpecificData, setTypeSpecificData] = useState<Record<string, any>>({});

  useEffect(() => {
    // Set mounted to true after component mounts to enable animations
    if (open) {
      setMounted(true);
    } else {
      // Reset state when dialog closes
      setTimeout(() => setMounted(false), 300);
    }
  }, [open]);

  if (!questionSet) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const getMediaTypeIcon = (mediaType: string | undefined) => {
    // Use mediaType or media_type property
    switch (mediaType) {
      case "text":
        return <FileText className="h-4 w-4" />;
      case "image":
        return <ImageIcon className="h-4 w-4" />;
      case "audio":
        return <Mic className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "file":
      case "document":
        return <File className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Group questions by type
  const questionsByType: Record<string, Question[]> = {};
  (questionSet.questions || []).forEach(question => {
    if (!questionsByType[question.type]) {
      questionsByType[question.type] = [];
    }
    questionsByType[question.type].push(question);
  });

  // Get unique question types
  const questionTypes = Object.keys(questionsByType);

  // Fetch type-specific data for a question if not already loaded
  const fetchTypeSpecificData = async (questionId: string, questionType: string) => {
    // Skip if already loading or loaded
    if (loadingTypeData[questionId] || typeSpecificData[questionId]) return;
    
    try {
      // Mark as loading
      setLoadingTypeData(prev => ({ ...prev, [questionId]: true }));
      
      // Get admin email from session storage (or use a default for demo)
      const adminEmail = sessionStorage.getItem('adminEmail') || 'admin@example.com';
      
      // Fetch the question data with type-specific details
      const questionData = await adminQuestionServices.getQuestionWithTypeData(questionId, adminEmail);
      
      // Store the fetched data
      setTypeSpecificData(prev => ({ ...prev, [questionId]: questionData }));
    } catch (error) {
      console.error(`Error fetching type data for question ${questionId}:`, error);
    } finally {
      // Mark as not loading anymore
      setLoadingTypeData(prev => ({ ...prev, [questionId]: false }));
    }
  };
  
  // Render type-specific data based on question type
  const renderTypeSpecificData = (question: Question) => {
    // Try to get type-specific data from our state
    const questionData = typeSpecificData[question.id];
    // Debug log for question data
    if (questionData) {
      // eslint-disable-next-line no-console
      console.log('Rendering Question Data:', question.type, questionData);
    }
    
    // If we don't have the data yet and we're not loading it, start loading
    if (!questionData && !loadingTypeData[question.id]) {
      fetchTypeSpecificData(question.id, question.type);
    }
    
    // If we're loading, show a loading indicator
    if (loadingTypeData[question.id]) {
      return (
        <div className="mt-3 flex items-center gap-2 text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
          <span>Loading question data...</span>
        </div>
      );
    }
    
    // If we have the data, use it; otherwise fall back to the question.typeData
    const typeData = questionData || question;
    
    // Display a header with the question type information
    const renderTypeHeader = () => {
      return (
        <div className="mb-4">
          <Badge variant="outline" className="border-blue-700 text-blue-300 bg-blue-900/50 px-3 py-1">
            Question Type: {question.type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </Badge>
        </div>
      );
    };
    
    // For rating-scale and slider, we need to handle the case where typeData might be empty
    // but we still want to show a default scale
    if (question.type === "rating-scale" || question.type === "slider") {
      // Continue even if typeData is missing or empty
    } else if (!typeData.typeData && !questionData?.options && !questionData?.scale && 
               !questionData?.matrix && !questionData?.imageOptions && 
               !questionData?.openEndedSettings) {
      return (
        <div className="mt-3 space-y-3">
          {renderTypeHeader()}
          <div className="flex items-center gap-2 text-gray-500 italic">
            <Database className="h-4 w-4" />
            <span>No type-specific data available for this {question.type} question</span>
          </div>
        </div>
      );
    }

    switch (question.type) {
      case "multiple-choice":
      case "likert-scale":
      case "dropdown":
      case "dichotomous":
      case "ranking": {
        // Use options from questionData if available
        const options = questionData?.options || [];
        return (
          <div className="mt-3 space-y-4">
            {renderTypeHeader()}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-blue-300">Options:</h4>
              <ul className="space-y-2 bg-gray-900/30 p-3 rounded-md border border-gray-800">
                {options.length === 0 ? (
                  <li className="text-gray-500 italic">No options available.</li>
                ) : (
                  options
                    .sort((a: QuestionTypeData, b: QuestionTypeData) => (a.option_order || 0) - (b.option_order || 0))
                    .map((option: QuestionTypeData, index: number) => (
                      <li key={option.id ?? option.option_order ?? index} className="flex items-center gap-3 text-gray-300 mb-2 p-2 bg-gray-800/30 rounded border border-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 font-mono text-sm">{option.option_order}</span>
                          <span className="text-white">{option.option_text || option.item_text}</span>
                        </div>
                      </li>
                    ))
                )}
              </ul>
            </div>
          </div>
        );
      }
      case "image-choice": {
        // Use imageOptions from questionData if available
        const imageOptions = questionData?.imageOptions || [];
        return (
          <div className="mt-3 space-y-4">
            {renderTypeHeader()}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-blue-300">Image Options:</h4>
              <ul className="space-y-2 bg-gray-900/30 p-3 rounded-md border border-gray-800">
                {imageOptions.length === 0 ? (
                  <li className="text-gray-500 italic">No image options available.</li>
                ) : (
                  imageOptions
                    .sort((a: QuestionTypeData, b: QuestionTypeData) => (a.option_order || 0) - (b.option_order || 0))
                    .map((option: QuestionTypeData, index: number) => (
                      <li key={option.id ?? option.option_order ?? index} className="flex items-center gap-3 text-gray-300 mb-2 p-2 bg-gray-800/30 rounded border border-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 font-mono text-sm">{option.option_order}</span>
                          <span className="text-white">{option.option_text}</span>
                        </div>
                        {option.image_url && (
                          <img 
                            src={option.image_url} 
                            alt={option.option_text || "Image option"} 
                            className="w-12 h-12 object-cover rounded ml-2 border border-blue-800" 
                          />
                        )}
                      </li>
                    ))
                )}
              </ul>
            </div>
          </div>
        );
      }

      case "rating-scale":
      case "slider":
        // Use values from questionData if available, otherwise fall back to typeData or defaults
        const scale = questionData?.scale || {};
        const minValue = scale?.min_value || question.typeData?.[0]?.min_value || 1;
        const maxValue = scale?.max_value || question.typeData?.[0]?.max_value || 5;
        const stepValue = scale?.step_value || question.typeData?.[0]?.step_value || 1;
        const defaultValue = scale?.default_value || question.typeData?.[0]?.default_value;
        
        return (
          <div className="mt-3 space-y-4">
            {renderTypeHeader()}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-blue-300">Scale Configuration:</h4>
              <div className="bg-gray-900/30 p-4 rounded-md border border-gray-800 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400">Min Value:</span>
                    <span className="text-lg font-medium text-white block">{minValue}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400">Max Value:</span>
                    <span className="text-lg font-medium text-white block">{maxValue}</span>
                  </div>
                  {stepValue && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-400">Step Value:</span>
                      <span className="text-lg font-medium text-white block">{stepValue}</span>
                    </div>
                  )}
                  {defaultValue !== undefined && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-400">Default Value:</span>
                      <span className="text-lg font-medium text-white block">{defaultValue}</span>
                    </div>
                  )}
                </div>
                
                <div className="pt-2">
                  <span className="text-xs text-gray-400 mb-2 block">Visual Scale:</span>
                  <div className="flex items-center gap-4 text-gray-300">
                    <span className="font-medium">{minValue}</span>
                    <div className="flex-1 h-3 bg-gray-800 rounded-full relative">
                      {defaultValue !== undefined && (
                        <div 
                          className="absolute w-4 h-4 bg-blue-500 rounded-full top-1/2 transform -translate-y-1/2 border-2 border-white"
                          style={{ left: `${((defaultValue - (minValue || 0)) / ((maxValue || 10) - (minValue || 0))) * 100}%` }}
                        />
                      )}
                    </div>
                    <span className="font-medium">{maxValue}</span>
                  </div>
                </div>
              </div>
              {/* Question type data display */}
            </div>
          </div>
        );

      case "matrix":
        // Use matrix data from questionData if available, otherwise fall back to typeData
        const matrixData = questionData?.matrix || {};
        const rows = matrixData.rows || 
                    (question.typeData ? question.typeData.filter(item => item.is_row) : []);
        const columns = matrixData.columns || 
                       (question.typeData ? question.typeData.filter(item => !item.is_row) : []);
        
        return (
          <div className="mt-3 space-y-4">
            {renderTypeHeader()}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-blue-300">Matrix Configuration:</h4>
              <div className="bg-gray-900/30 p-4 rounded-md border border-gray-800">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-blue-300 uppercase tracking-wider bg-blue-900/20"></th>
                        {columns
                          .sort((a: QuestionTypeData, b: QuestionTypeData) => (a.item_order || 0) - (b.item_order || 0))
                          .map((col: QuestionTypeData, index: number) => (
                            <th key={index} className="px-3 py-2 text-left text-xs font-medium text-blue-300 uppercase tracking-wider bg-blue-900/20">
                              {col.content}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {rows
                        .sort((a: QuestionTypeData, b: QuestionTypeData) => (a.item_order || 0) - (b.item_order || 0))
                        .map((row: QuestionTypeData, index: number) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-gray-900/30' : 'bg-gray-900/10'}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-300">{row.content}</td>
                            {columns.map((_: QuestionTypeData, colIndex: number) => (
                              <td key={colIndex} className="px-3 py-2 whitespace-nowrap text-sm text-gray-400 text-center">
                                <div className="w-5 h-5 rounded-full border border-blue-600 inline-block"></div>
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                <span className="font-mono text-blue-400">{rows.length}</span> rows, <span className="font-mono text-blue-400">{columns.length}</span> columns
              </div>
            </div>
          </div>
        );

      case "open-ended":
        // Use open-ended settings from questionData if available, otherwise fall back to typeData
        const openEndedSettings = questionData?.openEndedSettings || {};
        const format = openEndedSettings?.answer_format || 
                     (question.typeData && question.typeData[0]?.answer_format) || "text";
        const limit = openEndedSettings?.character_limit || 
                    (question.typeData && question.typeData[0]?.character_limit);
        
        return (
          <div className="mt-3 space-y-4">
            {renderTypeHeader()}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-blue-300">Open-Ended Configuration:</h4>
              <div className="bg-gray-900/30 p-4 rounded-md border border-gray-800 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400">Answer Format:</span>
                    <span className="text-lg font-medium text-white block capitalize">{format || "Free text"}</span>
                  </div>
                  {limit && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-400">Character Limit:</span>
                      <span className="text-lg font-medium text-white block">{limit}</span>
                    </div>
                  )}
                </div>
                
                <div className="border border-dashed border-gray-700 rounded p-3 bg-gray-900/50">
                  <span className="text-xs text-gray-400 block mb-2">Answer Preview:</span>
                  <div className="h-16 bg-gray-800/50 rounded p-2 text-gray-500 text-sm italic">
                    {format === 'text' && 'User can enter free text here...'}
                    {format === 'number' && '123...'}
                    {format === 'email' && 'user@example.com'}
                    {format === 'url' && 'https://example.com'}
                    {format === 'date' && '2025-05-01'}
                    {format === 'time' && '14:30:00'}
                    {format === 'tel' && '+1234567890'}
                  </div>
                </div>
              </div>
              {/* Question type data display */}
            </div>
          </div>
        );

      case "dichotomous":
        // For dichotomous questions, we might have the data in options or directly in typeData
        const dichotomousOptions = questionData?.options || [];
        const positive = dichotomousOptions[0]?.option_text || 
                       (question.typeData && question.typeData[0]?.positive_option) || "Yes";
        const negative = dichotomousOptions[1]?.option_text || 
                       (question.typeData && question.typeData[0]?.negative_option) || "No";
        
        return (
          <div className="mt-3 space-y-4">
            {renderTypeHeader()}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-blue-300">Dichotomous Options:</h4>
              <div className="bg-gray-900/30 p-4 rounded-md border border-gray-800">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-900/20 p-3 rounded border border-green-800 flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-green-500 flex-shrink-0"></div>
                    <span className="text-green-300 font-medium">{positive || "Yes"}</span>
                  </div>
                  <div className="bg-red-900/20 p-3 rounded border border-red-800 flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-red-500 flex-shrink-0"></div>
                    <span className="text-red-300 font-medium">{negative || "No"}</span>
                  </div>
                </div>
              </div>
              {/* Question type data display */}
            </div>
          </div>
        );

      // Ranking is now handled with the other option-based question types above

      default:
        return (
          <div className="mt-3 space-y-4">
            {renderTypeHeader()}
            <div className="p-6 bg-gray-900/30 border border-gray-800 rounded-lg">
              <div className="mb-3">
                <Badge className="bg-blue-900/50 text-blue-300 border-blue-700">
                  Question Type: {question.type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </Badge>
              </div>
              <h3 className="text-xl font-medium text-white mb-4">{question.question}</h3>
              <p className="text-gray-400 italic">No additional configuration for this question type.</p>
              <p className="text-xs text-gray-500 mt-2">No additional configuration for this question type.</p>
            </div>
          </div>
        );
    }
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50"
      onClick={() => onOpenChange(false)}
    >
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full ${isFullWidth ? 'md:w-full' : 'md:w-2/3'} bg-black/70 transform transition-all duration-300 ease-in-out ${mounted ? 'translate-x-0' : 'translate-x-full'}`}
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
                <Eye className="h-4 w-4" />
              </div>
              <span className="font-medium text-lg">View Questions: {questionSet.title}</span>
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
            
            {/* Description */}
            {questionSet.description && <p className="text-gray-400 mb-6">{questionSet.description}</p>}

            <div className="flex justify-between items-center mb-6">
              <div className="text-sm text-gray-400">{questionSet.questionCount} Questions</div>
              
              {questionSet.resource_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-blue-700 hover:bg-blue-900/30 text-blue-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(questionSet.resource_url, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Resource
                </Button>
              )}
            </div>

            {(questionSet.questions || []).length === 0 ? (
              <div className="bg-[#111318] rounded-lg p-8 text-center">
                <p className="text-gray-400">No questions in this set yet.</p>
              </div>
            ) : (
              <div>
                <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-6 bg-[#111318] border border-gray-800">
                    <TabsTrigger value="all">All Questions</TabsTrigger>
                    {questionTypes.map(type => (
                      <TabsTrigger key={type} value={type}>
                        {type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  <TabsContent value="all" className="space-y-6">
                    {(questionSet.questions || []).map((question) => (
  <div
    key={question.id}
    className="bg-[#111318] rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors"
  >
    <Badge className="bg-blue-900/50 text-blue-300 border-blue-700 mb-2">
  Question Type: {typeLabels[question.type] || question.type}
</Badge>
    <h3 className="text-white text-lg mb-2">{question.question}</h3>

    {/* Media rendering logic */}
    {question.file_url && (
      question.media_type === 'image' ? (
        <img 
          src={question.file_url} 
          alt={question.question} 
          className="max-h-40 rounded-md object-contain mb-2"
        />
      ) : question.media_type === 'audio' ? (
        <audio controls className="w-full mb-2">
          <source src={question.file_url} />
          Your browser does not support the audio element.
        </audio>
      ) : question.media_type === 'video' ? (
        <video controls className="max-h-40 w-full mb-2">
          <source src={question.file_url} />
          Your browser does not support the video element.
        </video>
      ) : (
        <div className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-2">
          <File className="h-4 w-4" />
          <a href={question.file_url} target="_blank" rel="noopener noreferrer">
            View attached file
          </a>
        </div>
      )
    )}

    {/* Render multiple choice options from typeSpecificData if available */}

                        {/* Media rendering logic */}
                        {question.file_url && (
                          question.media_type === 'image' ? (
                            <img 
                              src={question.file_url} 
                              alt={question.question} 
                              className="max-h-40 rounded-md object-contain mb-2"
                            />
                          ) : question.media_type === 'audio' ? (
                            <audio controls className="w-full mb-2">
                              <source src={question.file_url} />
                              Your browser does not support the audio element.
                            </audio>
                          ) : question.media_type === 'video' ? (
                            <video controls className="max-h-40 w-full mb-2">
                              <source src={question.file_url} />
                              Your browser does not support the video element.
                            </video>
                          ) : (
                            <div className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-2">
                              <File className="h-4 w-4" />
                              <a href={question.file_url} target="_blank" rel="noopener noreferrer">
                                View attached file
                              </a>
                            </div>
                          )
                        )}

                        {/* Render multiple choice options from typeSpecificData if available */}
                        {question.type === 'multiple-choice' && typeSpecificData[question.id]?.options && (
                          <ul className="mt-2 space-y-1">
                            {typeSpecificData[question.id].options.map((option: any) => (
                              <li key={option.id} className="flex items-center gap-2">
                                <span className="font-mono text-xs text-gray-400">{option.option_order}</span>
                                <span>{option.option_text}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-3 text-xs text-gray-500">
                          Created: {formatDate(question.created_at || question.createdAt || new Date().toISOString())}
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800 flex justify-between items-center">
            <div className="text-gray-500 text-sm">
              {questionSet.questionCount} questions in this set
            </div>
            <Button
              variant="outline"
              className="border-gray-700 text-white hover:bg-gray-800"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

