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
import { supabase } from "@/lib/supabase"
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      fetchQuestionTypeData();
      fetchComments();
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
