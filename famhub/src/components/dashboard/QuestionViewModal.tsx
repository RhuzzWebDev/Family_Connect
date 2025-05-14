"use client"

import { useState, useEffect, useRef } from "react"
import { formatDistanceToNow } from "date-fns"
import { 
  FileText, X, Maximize2, Minimize2, 
  ImageIcon, Video, Music, File, 
  Heart, MessageSquare, ExternalLink, 
  Send, Paperclip, Loader2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import { userAnswerQuestions } from "@/services/userAnswerQuestions"
import { toast } from "sonner"

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
}

interface QuestionViewModalProps {
  question: Question;
  onClose: () => void;
  isOpen: boolean;
}

interface Comment {
  id: string;
  question_id: string;
  user_email: string;
  content: string;
  media_type?: string | null;
  media_url?: string | null;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

export function QuestionViewModal({ question, onClose, isOpen }: QuestionViewModalProps) {
  const [isFullWidth, setIsFullWidth] = useState(false)
  const [questionTypeData, setQuestionTypeData] = useState<QuestionTypeData[]>([])
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [postingComment, setPostingComment] = useState(false)
  const [selectedMediaType, setSelectedMediaType] = useState<string | null>(null)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [userExistingAnswer, setUserExistingAnswer] = useState<any>(null)
  const [loadingExistingAnswer, setLoadingExistingAnswer] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch the user's existing answer for this question
  const fetchUserAnswer = async () => {
    const userEmail = sessionStorage.getItem('userEmail');
    if (!userEmail || !question.id) return;
    
    setLoadingExistingAnswer(true);
    try {
      // Get user ID from email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();
        
      if (userError || !userData) {
        console.error('User not found:', userError);
        return;
      }
      
      // Check if answers table exists
      const { error: tableCheckError } = await supabase
        .from('answers')
        .select('id')
        .limit(1);
      
      if (tableCheckError) {
        console.log('Answers table may not exist:', tableCheckError.message);
        return;
      }
      
      // Set the app user context for RLS policies
      await supabase.rpc('set_app_user', { p_email: userEmail });
      
      // Get user's answer for this question with proper headers
      const { data: answerData, error: answerError } = await supabase
        .from('answers')
        .select('*')
        .eq('question_id', question.id)
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle instead of single to avoid 406 errors
      
      if (answerError && answerError.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
        console.error('Error fetching answer:', answerError);
        return;
      }
      
      if (answerData) {
        console.log('Found existing answer:', answerData);
        setUserExistingAnswer(answerData);
        
        // Set the answer in the form
        if (answerData.answer_data) {
          // Format the answer based on its type and question type
          let formattedAnswer = answerData.answer_data;
          
          if (question.type === 'multiple-choice') {
            // For multiple choice, we need to extract the selected option
            if (Array.isArray(formattedAnswer)) {
              // If it's already an array, take the first item
              formattedAnswer = formattedAnswer[0];
            } else if (typeof formattedAnswer === 'object') {
              // If it's an object, convert to string
              formattedAnswer = JSON.stringify(formattedAnswer);
              // Try to parse it as an array and get the first item
              try {
                const parsed = JSON.parse(formattedAnswer);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  formattedAnswer = parsed[0];
                }
              } catch (e) {
                console.warn('Could not parse multiple choice answer:', e);
              }
            }
          } else if (question.type === 'likert-scale') {
            // For likert scale, ensure we have a string value
            if (typeof formattedAnswer === 'number') {
              formattedAnswer = String(formattedAnswer);
            } else if (typeof formattedAnswer === 'object') {
              // If it's an object or array, try to extract a usable value
              formattedAnswer = JSON.stringify(formattedAnswer);
              try {
                const parsed = JSON.parse(formattedAnswer);
                if (parsed && (typeof parsed === 'number' || typeof parsed === 'string')) {
                  formattedAnswer = String(parsed);
                }
              } catch (e) {
                console.warn('Could not parse likert scale answer:', e);
              }
            }
          } else if (typeof formattedAnswer === 'object') {
            formattedAnswer = JSON.stringify(formattedAnswer);
          }
          
          console.log('Setting answer from existing data:', formattedAnswer, 'for question type:', question.type);
          setAnswer(formattedAnswer);
        }
      }
    } catch (err) {
      console.error('Error in fetchUserAnswer:', err);
    } finally {
      setLoadingExistingAnswer(false);
    }
  };
  
  useEffect(() => {
    if (isOpen) {
      fetchQuestionTypeData();
      fetchComments();
      fetchUserAnswer();
      setSubmitError('');
    }
  }, [isOpen, question.id]);
  
  const fetchComments = async () => {
    if (!question.id) return;
    
    setCommentsLoading(true);
    try {
      // Check if comments table exists first
      const { error: tableCheckError } = await supabase
        .from('comments')
        .select('id')
        .limit(1);
      
      // If we get an error about the table not existing, just return empty comments
      if (tableCheckError) {
        console.log('Comments table may not exist:', tableCheckError.message);
        setComments([]);
        setCommentsLoading(false);
        return;
      }
      
      // Try a simpler query first without the join
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('question_id', question.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching comments:', error);
        setComments([]);
        return;
      }
      
      // If we have data, try to get user info for each comment
      if (data && data.length > 0) {
        // Get unique user emails
        const userEmails = [...new Set(data.map(comment => comment.user_email))].filter(Boolean);
        
        // If we have user emails, try to fetch user data
        if (userEmails.length > 0) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('email, first_name, last_name, role')
            .in('email', userEmails);
          
          if (!userError && userData) {
            // Create a map of email to user data for quick lookup
            const userMap = userData.reduce((acc, user) => {
              acc[user.email] = user;
              return acc;
            }, {} as Record<string, any>);
            
            // Add user data to each comment
            const formattedComments = data.map(comment => ({
              ...comment,
              user: userMap[comment.user_email] || {
                first_name: 'Unknown',
                last_name: 'User',
                role: ''
              }
            }));
            
            setComments(formattedComments);
            return;
          }
        }
      }
      
      // If we get here, we either have no comments or couldn't get user data
      // Just use the comments as-is with placeholder user data
      const formattedComments = data?.map(comment => ({
        ...comment,
        user: {
          first_name: comment.user_email?.split('@')[0] || 'Unknown',
          last_name: 'User',
          role: ''
        }
      })) || [];
      
      setComments(formattedComments);
    } catch (err) {
      console.error('Error in fetchComments:', err);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

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

  // Removed renderTypeSpecificContent function to stop displaying question type data/options

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setMediaFile(file);
    
    // Create a preview URL for the file
    if (selectedMediaType === 'image' || selectedMediaType === 'video' || selectedMediaType === 'audio') {
      const url = URL.createObjectURL(file);
      setMediaUrl(url);
    } else {
      setMediaUrl(null); // For other file types, we don't show a preview
    }
  };
  
  // Handle media type selection
  const handleMediaTypeSelect = (type: string) => {
    // If the same type is clicked again, deselect it
    if (selectedMediaType === type) {
      setSelectedMediaType(null);
      setMediaUrl(null);
      setMediaFile(null);
      return;
    }
    
    setSelectedMediaType(type);
    // Clear any previously selected file
    setMediaUrl(null);
    setMediaFile(null);
    
    // Trigger file input click
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 100);
  };
  
  // Get accept string for file input based on selected media type
  const getAcceptString = (): string => {
    switch (selectedMediaType) {
      case 'image':
        return 'image/*';
      case 'video':
        return 'video/*';
      case 'audio':
        return 'audio/*';
      case 'file':
        return '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx';
      default:
        return '*/*';
    }
  };
  
  // Handle posting a comment
  const handlePostComment = async () => {
    const userEmail = sessionStorage.getItem('userEmail');
    if (!userEmail) {
      toast.error('You must be logged in to post a comment');
      return;
    }
    
    if (!newComment.trim() && !mediaFile) {
      toast.error('Please enter a comment or attach a file');
      return;
    }
    
    setPostingComment(true);
    
    try {
      // First, check if comments table exists
      const { error: tableCheckError } = await supabase
        .from('comments')
        .select('id')
        .limit(1);
      
      // If the table doesn't exist, create it
      if (tableCheckError) {
        console.log('Comments table may not exist, creating a local comment instead');
        
        // Create a local comment object
        const newLocalComment = {
          id: `local-${Date.now()}`,
          question_id: question.id,
          user_email: userEmail,
          content: newComment.trim(),
          created_at: new Date().toISOString(),
          user: {
            first_name: userEmail.split('@')[0] || 'User',
            last_name: '',
            role: ''
          }
        };
        
        // Add the local comment to the state
        setComments([newLocalComment, ...comments]);
        
        // Clear form
        setNewComment('');
        setMediaFile(null);
        setMediaUrl(null);
        setSelectedMediaType(null);
        toast.success('Comment added locally (database table not available)');
        setPostingComment(false);
        return;
      }
      
      let mediaUploadPath = null;
      let mediaUploadUrl = null;
      
      // Upload media file if present
      if (mediaFile && selectedMediaType) {
        try {
          // Check if storage bucket exists
          const { error: storageCheckError } = await supabase.storage
            .from('media')
            .list();
          
          if (storageCheckError) {
            console.log('Storage bucket may not exist:', storageCheckError.message);
            toast.warning('Media upload skipped - storage not available');
          } else {
            const fileExt = mediaFile.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
            const filePath = `comments/${selectedMediaType}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
              .from('media')
              .upload(filePath, mediaFile);
              
            if (uploadError) {
              console.error('Error uploading file:', uploadError);
              toast.warning('Media upload failed, but comment will be posted');
            } else {
              // Get public URL for the uploaded file
              const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(filePath);
                
              mediaUploadPath = filePath;
              mediaUploadUrl = publicUrl;
            }
          }
        } catch (uploadErr) {
          console.error('Error in media upload:', uploadErr);
          toast.warning('Media upload failed, but comment will be posted');
        }
      }
      
      // Insert comment into database
      const { error: commentError } = await supabase
        .from('comments')
        .insert({
          question_id: question.id,
          user_email: userEmail,
          content: newComment.trim(),
          media_type: selectedMediaType,
          media_url: mediaUploadUrl,
          media_path: mediaUploadPath,
          created_at: new Date().toISOString() // Explicitly set created_at
        });
        
      if (commentError) {
        console.error('Error posting comment:', commentError);
        toast.error('Failed to post comment. Please try again.');
        return;
      }
      
      // Clear form and refresh comments
      setNewComment('');
      setMediaFile(null);
      setMediaUrl(null);
      setSelectedMediaType(null);
      toast.success('Comment posted successfully!');
      
      // Refresh comments
      fetchComments();
      
    } catch (err) {
      console.error('Error in handlePostComment:', err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setPostingComment(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
      <div 
        className="fixed inset-0 bg-black/80" 
        aria-hidden="true"
      />
      
      <div 
        className={`relative bg-[#1a1d24] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-800 bg-[#1a1d24] z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden">
              {getMediaTypeIcon(question.media_type)}
            </div>
            <span className="font-medium text-lg text-white">Question Details</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-400 hover:text-white" 
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 text-white">
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
          
          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {/* Answer Form - Moved up to appear right after question content */}
          <div className={`space-y-4 mt-6 mb-6 border ${userExistingAnswer ? 'border-green-600' : 'border-gray-800'} rounded-lg p-4 bg-[#111318] relative`}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Your Answer</h3>
              {userExistingAnswer && (
                <div className="flex items-center gap-2 bg-green-900/30 text-green-400 text-xs px-2 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>You've answered this question</span>
                </div>
              )}
              {loadingExistingAnswer && (
                <div className="flex items-center gap-2 text-blue-400 text-xs">
                  <div className="w-3 h-3 border-2 border-t-transparent border-blue-400 rounded-full animate-spin"></div>
                  <span>Loading your answer...</span>
                </div>
              )}
            </div>
            
            <div className="text-sm text-gray-400 mb-4">
              {question.type === 'multiple-choice' && 'Choose one of the following options:'}
              {question.type === 'rating-scale' && 'Rate on a scale:'}
              {question.type === 'slider' && 'Select a value:'}
              {question.type === 'open-ended' && 'Type your answer below:'}
              {question.type === 'dichotomous' && 'Choose Yes or No:'}
              {question.type === 'likert-scale' && 'Select your level of agreement:'}
              {question.type === 'ranking' && 'Drag to rank the items:'}
              {question.type === 'matrix' && 'Complete the matrix:'}
              {question.type === 'dropdown' && 'Select an option:'}
            </div>

            {/* Multiple Choice Question */}
            {question.type === 'multiple-choice' && questionTypeData.length > 0 && (
              <div className="space-y-2">
                {questionTypeData.map((option, index) => {
                  // Check if this option is selected in the current form
                  const isSelected = option.option_text === answer;
                  
                  // Check if this was the user's last saved answer
                  const isLastAnswer = userExistingAnswer && option.option_text === answer;
                  
                  return (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg border flex items-center justify-between
                        ${isSelected ? 
                          userExistingAnswer ? 'bg-green-900/30 border-green-500' : 'bg-blue-900/30 border-blue-500' 
                          : 'bg-gray-800 border-gray-700 hover:border-gray-600'}
                        ${isLastAnswer ? 'ring-2 ring-green-500 ring-offset-1 ring-offset-gray-900' : ''}
                        cursor-pointer transition-colors`}
                      onClick={() => setAnswer(option.option_text || '')}
                    >
                      <div className="flex items-center gap-2">
                        {isLastAnswer && (
                          <div className="text-xs font-medium text-green-400 bg-green-900/50 px-2 py-0.5 rounded-full">
                            Last answer
                          </div>
                        )}
                        <span>{option.option_text}</span>
                      </div>
                      {isSelected && (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${userExistingAnswer ? 'bg-green-500' : 'bg-blue-500'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rating Scale Question */}
            {question.type === 'rating-scale' && questionTypeData.length > 0 && (
              <div className="space-y-4">
                {userExistingAnswer && answer && (
                  <div className="text-xs font-medium text-green-400 bg-green-900/50 px-2 py-1 rounded-full inline-block">
                    Last answer: {answer}
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{questionTypeData[0]?.min_value || 0}</span>
                  <span>{questionTypeData[0]?.max_value || 10}</span>
                </div>
                <input
                  type="range"
                  min={questionTypeData[0]?.min_value || 0}
                  max={questionTypeData[0]?.max_value || 10}
                  step={questionTypeData[0]?.step_value || 1}
                  value={answer || questionTypeData[0]?.default_value || 5}
                  onChange={(e) => setAnswer(e.target.value)}
                  className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${userExistingAnswer ? 'ring-1 ring-green-500 ring-offset-1 ring-offset-gray-900' : ''}`}
                />
                <div className={`text-center text-lg font-medium ${userExistingAnswer ? 'text-green-400' : 'text-white'}`}>
                  {answer || questionTypeData[0]?.default_value || 5}
                </div>
              </div>
            )}

            {/* Slider Question */}
            {question.type === 'slider' && questionTypeData.length > 0 && (
              <div className="space-y-4">
                {userExistingAnswer && answer && (
                  <div className="text-xs font-medium text-green-400 bg-green-900/50 px-2 py-1 rounded-full inline-block">
                    Last answer: {answer}
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{questionTypeData[0]?.min_value || 0}</span>
                  <span>{questionTypeData[0]?.max_value || 100}</span>
                </div>
                <input
                  type="range"
                  min={questionTypeData[0]?.min_value || 0}
                  max={questionTypeData[0]?.max_value || 100}
                  step={questionTypeData[0]?.step_value || 1}
                  value={answer || questionTypeData[0]?.default_value || 50}
                  onChange={(e) => setAnswer(e.target.value)}
                  className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${userExistingAnswer ? 'ring-1 ring-green-500 ring-offset-1 ring-offset-gray-900' : ''}`}
                />
                <div className={`text-center text-lg font-medium ${userExistingAnswer ? 'text-green-400' : 'text-white'}`}>
                  {answer || questionTypeData[0]?.default_value || 50}
                </div>
              </div>
            )}

            {/* Open Ended Question */}
            {question.type === 'open-ended' && (
              <div className="space-y-2">
                {userExistingAnswer && answer && (
                  <div className="text-xs font-medium text-green-400 bg-green-900/50 px-2 py-1 rounded-full inline-block">
                    Last answer provided
                  </div>
                )}
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className={`w-full p-3 rounded-md bg-gray-800 text-white border ${userExistingAnswer ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'} outline-none min-h-[100px]`}
                  placeholder="Type your answer here..."
                />
              </div>
            )}

            {/* Dichotomous Question */}
            {question.type === 'dichotomous' && questionTypeData.length > 0 && (
              <div className="flex gap-4">
                <button
                  className={`flex-1 p-3 rounded-lg flex items-center justify-center gap-2 
                    ${answer === (questionTypeData[0]?.positive_option || 'Yes') ? 
                      userExistingAnswer ? 'bg-green-700 text-white border border-green-500' : 'bg-blue-700 text-white border border-blue-500' 
                      : 'bg-gray-800 text-gray-300'}
                    ${userExistingAnswer && answer === (questionTypeData[0]?.positive_option || 'Yes') ? 
                      'ring-2 ring-green-500 ring-offset-1 ring-offset-gray-900' : ''}`}
                  onClick={() => setAnswer(questionTypeData[0]?.positive_option || 'Yes')}
                >
                  <div className="flex flex-col items-center gap-1">
                    {userExistingAnswer && answer === (questionTypeData[0]?.positive_option || 'Yes') && (
                      <div className="text-xs font-medium text-green-300 bg-green-900/50 px-2 py-0.5 rounded-full">
                        Last answer
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {answer === (questionTypeData[0]?.positive_option || 'Yes') && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {questionTypeData[0]?.positive_option || 'Yes'}
                    </div>
                  </div>
                </button>
                <button
                  className={`flex-1 p-3 rounded-lg flex items-center justify-center gap-2 
                    ${answer === (questionTypeData[0]?.negative_option || 'No') ? 
                      userExistingAnswer ? 'bg-green-700 text-white border border-green-500' : 'bg-blue-700 text-white border border-blue-500' 
                      : 'bg-gray-800 text-gray-300'}
                    ${userExistingAnswer && answer === (questionTypeData[0]?.negative_option || 'No') ? 
                      'ring-2 ring-green-500 ring-offset-1 ring-offset-gray-900' : ''}`}
                  onClick={() => setAnswer(questionTypeData[0]?.negative_option || 'No')}
                >
                  <div className="flex flex-col items-center gap-1">
                    {userExistingAnswer && answer === (questionTypeData[0]?.negative_option || 'No') && (
                      <div className="text-xs font-medium text-green-300 bg-green-900/50 px-2 py-0.5 rounded-full">
                        Last answer
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {answer === (questionTypeData[0]?.negative_option || 'No') && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {questionTypeData[0]?.negative_option || 'No'}
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Likert Scale Question */}
            {question.type === 'likert-scale' && (
              <div className="space-y-3">
                {/* Debug info */}
                {userExistingAnswer && (
                  <div className="text-xs font-medium text-green-400 bg-green-900/50 px-2 py-1 rounded-full inline-block mb-2">
                    Your last answer: {answer ? ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'][parseInt(answer) - 1] || answer : 'None'}
                  </div>
                )}
                
                <div className="grid grid-cols-5 gap-2">
                  {['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'].map((option, index) => {
                    // Convert to string for comparison since answer might come from different sources
                    const optionValue = String(index + 1);
                    const isSelected = answer === optionValue;
                    const isLastAnswer = userExistingAnswer && isSelected;
                    
                    return (
                      <button
                        key={index}
                        className={`p-2 text-xs sm:text-sm rounded-lg text-center relative 
                          ${isSelected ? 
                            userExistingAnswer ? 'bg-green-700 text-white border border-green-500' : 'bg-blue-700 text-white border border-blue-500' 
                            : 'bg-gray-800 text-gray-300'}
                          ${isLastAnswer ? 'ring-2 ring-green-500 ring-offset-1 ring-offset-gray-900' : ''}`}
                        onClick={() => setAnswer(optionValue)}
                      >
                        <div className="flex flex-col items-center gap-1">
                          {isLastAnswer && (
                            <div className="text-xs font-medium text-green-300 bg-green-900/50 px-2 py-0.5 rounded-full mb-1">
                              Last answer
                            </div>
                          )}
                          {option}
                          {isSelected && (
                            <div className={`w-3 h-3 rounded-full flex items-center justify-center mt-1 ${userExistingAnswer ? 'bg-green-500' : 'bg-blue-500'}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ranking Question */}
            {question.type === 'ranking' && questionTypeData.length > 0 && (
              <div className="space-y-2">
                
                {/* Initialize answer if empty */}
                {!answer && (() => {
                  const initialRanking = questionTypeData
                    .sort((a, b) => (a.item_order || 0) - (b.item_order || 0))
                    .map(item => item.item_text || '');
                  setTimeout(() => setAnswer(JSON.stringify(initialRanking)), 0);
                  return null;
                })()}
                
                {/* Ranking items */}
                {(answer ? JSON.parse(answer) as string[] : questionTypeData
                  .sort((a, b) => (a.item_order || 0) - (b.item_order || 0))
                  .map(item => item.item_text || ''))
                  .map((item, index, items) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-[#1e2330] rounded-lg border border-gray-700 transition-all duration-300">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-white font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-grow">{item}</div>
                      <div className="flex-shrink-0 space-x-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          disabled={index === 0}
                          onClick={() => {
                            const newRanking = [...JSON.parse(answer)];
                            [newRanking[index], newRanking[index - 1]] = [newRanking[index - 1], newRanking[index]];
                            setAnswer(JSON.stringify(newRanking));
                          }}
                        >
                          ↑
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          disabled={index === items.length - 1}
                          onClick={() => {
                            const newRanking = [...JSON.parse(answer)];
                            [newRanking[index], newRanking[index + 1]] = [newRanking[index + 1], newRanking[index]];
                            setAnswer(JSON.stringify(newRanking));
                          }}
                        >
                          ↓
                        </Button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* Matrix Question */}
            {question.type === 'matrix' && questionTypeData.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-left"></th>
                      {questionTypeData.filter(col => !col.is_row).map((col, colIndex) => (
                        <th key={colIndex} className="p-2 text-center">{col.content}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {questionTypeData.filter(row => row.is_row).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t border-gray-800">
                        <td className="p-2 text-left font-medium">{row.content}</td>
                        {questionTypeData.filter(col => !col.is_row).map((col, colIndex) => {
                          const cellId = `${rowIndex}-${colIndex}`;
                          const currentAnswer = answer ? JSON.parse(answer) : {};
                          const isSelected = currentAnswer[cellId];
                          
                          return (
                            <td key={colIndex} className="p-2 text-center">
                              <Button
                                variant={isSelected ? 'default' : 'outline'}
                                size="sm"
                                className="w-8 h-8 rounded-full p-0"
                                onClick={() => {
                                  const newAnswer = answer ? JSON.parse(answer) : {};
                                  newAnswer[cellId] = !isSelected;
                                  setAnswer(JSON.stringify(newAnswer));
                                }}
                              >
                                {isSelected ? '✓' : ''}
                              </Button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Dropdown Question */}
            {question.type === 'dropdown' && questionTypeData.length > 0 && (
              <div className="space-y-3">
                <div className="relative">
                  {userExistingAnswer && answer && (
                    <div className="absolute -top-3 left-3 z-10 text-xs font-medium text-green-400 bg-green-900/50 px-2 py-0.5 rounded-full">
                      Last answer
                    </div>
                  )}
                  <select
                    value={answer || ''}
                    onChange={(e) => setAnswer(e.target.value)}
                    className={`w-full p-3 rounded-md bg-gray-800 text-white border ${answer ? 
                      userExistingAnswer ? 'border-green-500 ring-1 ring-green-500' : 'border-blue-500 ring-1 ring-blue-500' 
                      : 'border-gray-700'} 
                      ${userExistingAnswer && answer ? 'ring-2 ring-green-500 ring-offset-1 ring-offset-gray-900' : ''} 
                      focus:ring-2 outline-none appearance-none`}
                  >
                    <option value="" disabled>Select an option...</option>
                    {questionTypeData.map((option, index) => {
                      const isSelected = option.option_text === answer;
                      return (
                        <option key={index} value={option.option_text}>
                          {option.option_text} {isSelected && userExistingAnswer ? '(Last answer)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                    ▼
                  </div>
                </div>
                
                {answer && (
                  <div className="flex items-center gap-2 bg-gray-800/50 p-2 rounded-md">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${userExistingAnswer ? 'bg-green-500' : 'bg-blue-500'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className={`text-sm ${userExistingAnswer ? 'text-green-400' : 'text-blue-400'}`}>
                      Selected: {answer}
                    </div>
                  </div>
                )}
              </div>
            )}

            {submitError && (
              <div className="text-red-500 text-sm mt-2">{submitError}</div>
            )}

            <Button
              className={`w-full mt-4 ${userExistingAnswer ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              disabled={!answer || submitting}
              onClick={async () => {
                setSubmitting(true);
                setSubmitError('');
                try {
                  const userEmail = sessionStorage.getItem('userEmail');
                  if (!userEmail) throw new Error('Not logged in');

                  const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', userEmail)
                    .single();

                  if (userError || !userData) throw new Error('User not found');

                  // Determine the appropriate answer format based on question type
                  let answer_format: 'text' | 'number' | 'array' | 'json';
                  switch (question.type) {
                    case 'multiple-choice':
                    case 'image-choice':
                    case 'ranking':
                      answer_format = 'array';
                      break;
                    case 'rating-scale':
                    case 'likert-scale':
                    case 'slider':
                      answer_format = 'number';
                      break;
                    case 'matrix':
                      answer_format = 'json';
                      break;
                    case 'dropdown':
                    case 'open-ended':
                    case 'dichotomous':
                    default:
                      answer_format = 'text';
                      break;
                  }

                  // Use the userAnswerQuestions service to submit the answer
                  // The service handles all the formatting and authentication
                  const { data, error: answerError } = await userAnswerQuestions.submitAnswer({
                    question_id: question.id,
                    answer_data: answer,
                    answer_format,
                    question_type: question.type || 'text'
                  });

                  if (answerError) {
                    console.error('Answer submission error:', answerError);
                    throw answerError;
                  }

                  toast.success(userExistingAnswer ? 'Answer updated successfully!' : 'Answer submitted successfully!');
                  // Update the existing answer data
                  setUserExistingAnswer(data);
                  onClose();
                } catch (err) {
                  const errorMessage = err instanceof Error ? err.message : 'Failed to submit answer';
                  setSubmitError(errorMessage);
                  toast.error(errorMessage);
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? 'Submitting...' : userExistingAnswer ? 'Update Answer' : 'Submit Answer'}
            </Button>
          </div>
          
          {/* Author and date section removed as requested */}
          
          {/* Comments section with improved UI */}
          <div className="mt-8 bg-[#111318] rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-medium mb-4 text-blue-300">Discussion</h3>
            
            {/* Custom comment input */}
            <div className="mb-6">
              <textarea
                className="w-full bg-[#1a1d24] border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add your thoughts or questions..."
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={postingComment}
              />
              
              {/* Show selected media preview if any */}
              {mediaUrl && (
                <div className="mt-2 relative bg-[#1a1d24] p-2 rounded-md border border-gray-700 flex items-center">
                  {selectedMediaType === 'image' && (
                    <img src={mediaUrl} alt="Preview" className="h-16 w-auto rounded" />
                  )}
                  {selectedMediaType === 'video' && (
                    <video src={mediaUrl} className="h-16 w-auto rounded" />
                  )}
                  {selectedMediaType === 'audio' && (
                    <div className="flex items-center">
                      <Music className="h-6 w-6 mr-2 text-blue-400" />
                      <span className="text-sm text-gray-300">{mediaFile?.name || 'Audio file'}</span>
                    </div>
                  )}
                  {selectedMediaType === 'file' && (
                    <div className="flex items-center">
                      <FileText className="h-6 w-6 mr-2 text-blue-400" />
                      <span className="text-sm text-gray-300">{mediaFile?.name || 'File attachment'}</span>
                    </div>
                  )}
                  <button 
                    className="absolute top-1 right-1 bg-gray-800 rounded-full p-1 text-gray-400 hover:text-white"
                    onClick={() => {
                      setMediaUrl(null);
                      setMediaFile(null);
                      setSelectedMediaType(null);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              
              <div className="flex justify-between mt-2">
                <div className="flex space-x-2">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    onChange={handleFileChange}
                    accept={getAcceptString()}
                  />
                  <button 
                    className={`${selectedMediaType === 'file' ? 'bg-blue-900 text-blue-300' : 'bg-[#1a1d24] text-gray-400 hover:text-white'} p-2 rounded-md transition-colors`}
                    onClick={() => handleMediaTypeSelect('file')}
                    disabled={postingComment}
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                  <button 
                    className={`${selectedMediaType === 'image' ? 'bg-blue-900 text-blue-300' : 'bg-[#1a1d24] text-gray-400 hover:text-white'} p-2 rounded-md transition-colors`}
                    onClick={() => handleMediaTypeSelect('image')}
                    disabled={postingComment}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <button 
                    className={`${selectedMediaType === 'video' ? 'bg-blue-900 text-blue-300' : 'bg-[#1a1d24] text-gray-400 hover:text-white'} p-2 rounded-md transition-colors`}
                    onClick={() => handleMediaTypeSelect('video')}
                    disabled={postingComment}
                  >
                    <Video className="h-4 w-4" />
                  </button>
                  <button 
                    className={`${selectedMediaType === 'audio' ? 'bg-blue-900 text-blue-300' : 'bg-[#1a1d24] text-gray-400 hover:text-white'} p-2 rounded-md transition-colors`}
                    onClick={() => handleMediaTypeSelect('audio')}
                    disabled={postingComment}
                  >
                    <Music className="h-4 w-4" />
                  </button>
                </div>
                <button 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handlePostComment}
                  disabled={postingComment || (!newComment.trim() && !mediaFile)}
                >
                  {postingComment ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Post Comment
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Comments display */}
            <div className="space-y-4">
              {commentsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                  <p className="text-gray-400 mt-2">Loading comments...</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-4">
                  No comments yet. Be the first to start the discussion!
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-[#1a1d24] rounded-lg p-4 border border-gray-800">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center font-semibold bg-blue-900 text-white flex-shrink-0">
                        {comment.user?.first_name?.charAt(0) || '?'}{comment.user?.last_name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm text-gray-200">
                            {comment.user?.first_name} {comment.user?.last_name}
                            {comment.user?.role && (
                              <span className="text-xs text-gray-400 ml-2">{comment.user.role}</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mt-1 break-words">{comment.content}</p>
                        
                        {/* Media content */}
                        {comment.media_url && comment.media_type && (
                          <div className="mt-3">
                            {comment.media_type === 'image' && (
                              <img 
                                src={comment.media_url} 
                                alt="Comment attachment" 
                                className="max-h-48 rounded-md object-contain bg-black/30"
                              />
                            )}
                            {comment.media_type === 'video' && (
                              <video 
                                src={comment.media_url} 
                                controls 
                                className="max-h-48 w-full rounded-md"
                              />
                            )}
                            {comment.media_type === 'audio' && (
                              <audio 
                                src={comment.media_url} 
                                controls 
                                className="w-full rounded-md"
                              />
                            )}
                            {comment.media_type === 'file' && (
                              <a 
                                href={comment.media_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-gray-800 p-2 rounded-md text-blue-400 hover:text-blue-300 w-fit"
                              >
                                <FileText className="h-4 w-4" />
                                <span>View attachment</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
