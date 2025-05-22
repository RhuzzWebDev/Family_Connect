"use client"

import { useState, useEffect, useRef } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  FileText, X, Maximize2, Minimize2, 
  ImageIcon, Video, Music, File, 
  Heart, MessageSquare, ExternalLink, 
  Send, Paperclip, Loader2,
  AlertCircle, AlertTriangle, Check, MessageSquareReply,
  Database
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabaseClient"
import { userAnswerQuestions } from "@/services/userAnswerQuestions"
import { toast } from "sonner"
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";

// Custom HeartFilled component for likes
const HeartFilled = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

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
  // For demographic questions
  field_type?: string;
  is_required?: boolean;
  has_other_option?: boolean;
  options?: Array<{
    option_text: string;
    option_order: number;
    question_demographic_id?: string;
    id?: string;
  }>;
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
  user_id: string;
  content: string;
  media_type?: string | null;
  file_url?: string | null;
  created_at: string;
  parent_id?: string | null; // For replies
  like_count?: number; // Like count
  user_has_liked?: boolean; // Whether the current user has liked this comment
  replies?: Comment[]; // For nested replies
  user_email?: string; // Added for compatibility
  users?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  user?: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

export function QuestionViewModal({ question, onClose, isOpen }: QuestionViewModalProps) {
  const { data: session } = useSession();
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
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null)
  const [likingComment, setLikingComment] = useState(false)
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [userExistingAnswer, setUserExistingAnswer] = useState<any>(null)
  const [loadingExistingAnswer, setLoadingExistingAnswer] = useState(false)
  const [resettingAnswer, setResettingAnswer] = useState(false)
  const [activeTab, setActiveTab] = useState('your-answer')
  const [communityAnswers, setCommunityAnswers] = useState<Record<string, number>>({})
  const [userAnswers, setUserAnswers] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Add this useEffect to log when relevant state changes
  useEffect(() => {
    console.log('State updated:', { 
      userExistingAnswer: !!userExistingAnswer, 
      answer, 
      questionType: question.type,
      options: questionTypeData.map(opt => opt.option_text)
    });
  }, [userExistingAnswer, answer, question.type, questionTypeData]);

  // Handle resetting the user's answer without refreshing the page
  const handleResetAnswer = async () => {
    if (!userExistingAnswer || !userExistingAnswer.id) {
      toast.error("No answer to reset");
      return;
    }

    setResettingAnswer(true);
    try {
      // Get user email from NextAuth session
      const userEmail = session?.user?.email;
      if (!userEmail) throw new Error('Not logged in');

      // Get user ID from email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (userError || !userData) throw new Error('User not found');

      // Delete all answers for this question from this user to ensure complete removal
      const { error } = await supabase
        .from('answers')
        .delete()
        .eq('question_id', question.id)
        .eq('user_id', userData.id);
      
      if (error) {
        toast.error(`Failed to reset answer: ${error.message}`);
      } else {
        toast.success("Your answer has been reset");
        // Reset all local state
        setUserExistingAnswer(null);
        setAnswer('');
        // Refresh community answers without closing the modal
        calculateCommunityAnswers();
      }
    } catch (err) {
      console.error('Error resetting answer:', err);
      toast.error("An unexpected error occurred");
    } finally {
      setResettingAnswer(false);
    }
  };

  // Fetch the user's existing answer for this question
  const fetchUserAnswer = async () => {
    // Use NextAuth session instead of sessionStorage
    const userEmail = session?.user?.email;
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
              // If it's an object, try to get the first value
              try {
                // Try to parse it if it's a stringified JSON
                if (typeof formattedAnswer === 'string') {
                  const parsed = JSON.parse(formattedAnswer);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    formattedAnswer = parsed[0];
                  } else if (parsed && typeof parsed === 'object') {
                    formattedAnswer = Object.values(parsed)[0];
                  }
                } else {
                  // It's already an object
                  formattedAnswer = Object.values(formattedAnswer)[0];
                }
              } catch (e) {
                console.warn('Could not parse multiple choice answer:', e);
                // If parsing fails, convert to string as fallback
                formattedAnswer = JSON.stringify(formattedAnswer);
              }
            }
          } else if (question.type === 'likert-scale') {
            // For likert scale, ensure we have a string value
            if (typeof formattedAnswer === 'number') {
              formattedAnswer = String(formattedAnswer);
            } else if (typeof formattedAnswer === 'object') {
              // If it's an object or array, try to extract a usable value
              try {
                if (typeof formattedAnswer === 'string') {
                  const parsed = JSON.parse(formattedAnswer);
                  if (parsed && (typeof parsed === 'number' || typeof parsed === 'string')) {
                    formattedAnswer = String(parsed);
                  }
                } else {
                  // It's already an object
                  const values = Object.values(formattedAnswer);
                  if (values.length > 0) {
                    formattedAnswer = String(values[0]);
                  }
                }
              } catch (e) {
                console.warn('Could not parse likert scale answer:', e);
                formattedAnswer = JSON.stringify(formattedAnswer);
              }
            }
          } else if (typeof formattedAnswer === 'object') {
            try {
              // Try to extract a usable value from the object
              const values = Object.values(formattedAnswer);
              if (values.length > 0) {
                formattedAnswer = values[0];
              } else {
                formattedAnswer = JSON.stringify(formattedAnswer);
              }
            } catch (e) {
              console.warn('Could not extract value from object:', e);
              formattedAnswer = JSON.stringify(formattedAnswer);
            }
          }
          
          console.log('Setting answer from existing data:', formattedAnswer, 'Type:', typeof formattedAnswer, 'for question type:', question.type);
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
      // Don't reset states when reopening, just clear errors
      setSubmitError('');
      
      // Fetch fresh data
      fetchQuestionTypeData();
      fetchComments();
      fetchUserAnswer();
      calculateCommunityAnswers();
    }
  }, [isOpen, question.id]);
  
  // Define user data interface
  interface UserData {
    id: string | number;
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: string;
  }
  
  // Interface for user answer data
  interface UserAnswer {
    user: UserData;
    answer_data: any;
    created_at: string;
  }

  // Calculate community answer statistics and get user answers
  const calculateCommunityAnswers = async () => {
    if (!question.id) return;
    
    try {
      // Get answers with user data
      const { data, error } = await supabase
        .from('answers')
        .select(`
          answer_data,
          created_at,
          user_id,
          users:user_id (id, first_name, last_name, email, role)
        `)
        .eq('question_id', question.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching community answers:', error);
        return;
      }
      
      const answerStats: Record<string, number> = {};
      const userAnswers: UserAnswer[] = [];
      
      if (data && data.length > 0) {
        data.forEach((answer) => {
          // Format user answer for display
          if (answer.users) {
            // Handle users data which might be an array or object
            let userData: UserData;
            
            // Use type assertion to handle potential array or object
            if (Array.isArray(answer.users)) {
              // If it's an array, take the first item
              if (answer.users.length > 0) {
                const user = answer.users[0] as any;
                userData = {
                  id: user?.id || answer.user_id || 0,
                  first_name: user?.first_name || '',
                  last_name: user?.last_name || '',
                  email: user?.email || '',
                  role: user?.role || ''
                };
              } else {
                userData = {
                  id: answer.user_id || 0,
                  first_name: '',
                  last_name: '',
                  email: '',
                  role: ''
                };
              }
            } else {
              // If it's an object, use it directly
              const user = answer.users as any;
              userData = {
                id: user?.id || answer.user_id || 0,
                first_name: user?.first_name || '',
                last_name: user?.last_name || '',
                email: user?.email || '',
                role: user?.role || ''
              };
            }
            
            userAnswers.push({
              user: userData,
              answer_data: answer.answer_data,
              created_at: answer.created_at
            });
          }
          
          // Calculate statistics
          if (typeof answer.answer_data === 'string') {
            answerStats[answer.answer_data] = (answerStats[answer.answer_data] || 0) + 1;
          } else if (Array.isArray(answer.answer_data)) {
            answer.answer_data.forEach((val) => {
              answerStats[val] = (answerStats[val] || 0) + 1;
            });
          } else if (answer.answer_data && typeof answer.answer_data === 'object') {
            // Handle object format
            const values = Object.values(answer.answer_data);
            values.forEach((val) => {
              if (typeof val === 'string' || typeof val === 'number') {
                const strVal = String(val);
                answerStats[strVal] = (answerStats[strVal] || 0) + 1;
              }
            });
          }
        });
      }
      
      setCommunityAnswers(answerStats);
      setUserAnswers(userAnswers);
    } catch (err) {
      console.error('Error in calculateCommunityAnswers:', err);
    }
  };
  
  const fetchComments = async () => {
    if (!question.id) return;
    
    setCommentsLoading(true);
    try {
      // Set the app user context for RLS policies
      const userEmail = session?.user?.email;
      if (!userEmail) {
        setCommentsLoading(false);
        return;
      }
      
      await supabase.rpc('set_app_user', { p_email: userEmail });
      
      // Get current user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();
        
      if (userError) {
        console.error('Error getting user ID:', userError);
        setCommentsLoading(false);
        return;
      }
      
      const userId = userData.id;
      
      // Fetch comments from the existing comments table with a join to get user data
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          users:user_id (id, first_name, last_name, email, role)
        `)
        .eq('question_id', question.id)
        .is('parent_id', null) // Only get top-level comments
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching comments:', error);
        setComments([]);
        return;
      }
      
      // Get likes for the current user
      const { data: likeData, error: likeError } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', userId);
        
      if (likeError) {
        console.error('Error fetching likes:', likeError);
      }
      
      // Create a set of comment IDs the user has liked
      const userLikedComments = new Set(
        likeData?.map(like => like.comment_id) || []
      );
      
      // Fetch replies for these comments
      let replies: Comment[] = [];
      if (data && data.length > 0) {
        const commentIds = data.map(comment => comment.id);
        
        const { data: replyData, error: replyError } = await supabase
          .from('comments')
          .select(`
            *,
            users:user_id (id, first_name, last_name, email, role)
          `)
          .in('parent_id', commentIds)
          .order('created_at', { ascending: true });
          
        if (replyError) {
          console.error('Error fetching replies:', replyError);
        } else {
          replies = replyData || [];
        }
      }
      
      // Format the comments to include user data, likes, and replies
      if (data && data.length > 0) {
        // First, format all replies
        const formattedReplies = replies.map(reply => {
          const replyUserData = reply.users;
          
          return {
            ...reply,
            user_email: replyUserData?.email || '',
            user_has_liked: userLikedComments.has(reply.id),
            user: {
              first_name: replyUserData?.first_name || 'Unknown',
              last_name: replyUserData?.last_name || 'User',
              role: replyUserData?.role || ''
            }
          };
        });
        
        // Group replies by parent_id
        const repliesByParent: Record<string, Comment[]> = {};
        formattedReplies.forEach(reply => {
          if (reply.parent_id) {
            if (!repliesByParent[reply.parent_id]) {
              repliesByParent[reply.parent_id] = [];
            }
            repliesByParent[reply.parent_id].push(reply);
          }
        });
        
        // Format the main comments and add their replies
        const formattedComments = data.map(comment => {
          // Extract user data from the joined users table
          const userData = comment.users;
          
          return {
            ...comment,
            // Add user_email for compatibility with existing code
            user_email: userData?.email || '',
            // Check if user has liked this comment
            user_has_liked: userLikedComments.has(comment.id),
            // Add replies to this comment
            replies: repliesByParent[comment.id] || [],
            // Add user object for display
            user: {
              first_name: userData?.first_name || 'Unknown',
              last_name: userData?.last_name || 'User',
              role: userData?.role || ''
            }
          };
        });
        
        setComments(formattedComments);
      } else {
        setComments([]);
      }
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
        case 'demographic':
          tableName = 'question_demographic';
          break;
        default:
          console.log(`No specific table for question type: ${question.type}`);
          setLoading(false);
          return;
      }
      
      if (tableName) {
        // Special handling for demographic questions - need to fetch both demographic data and options
        if (question.type === 'demographic') {
          // First, fetch the demographic question data
          const { data: demographicData, error: demographicError } = await supabase
            .from('question_demographic')
            .select('*')
            .eq('question_id', question.id)
            .single();
            
          if (demographicError) {
            console.error('Error fetching demographic data:', demographicError);
          } else if (demographicData) {
            console.log('Fetched demographic data:', demographicData);
            
            // Then fetch the demographic options using the question_demographic_id
            const { data: optionsData, error: optionsError } = await supabase
              .from('question_demographic_option')
              .select('*')
              .eq('question_demographic_id', demographicData.id)
              .order('option_order', { ascending: true });
              
            if (optionsError) {
              console.error('Error fetching demographic options:', optionsError);
            } else {
              console.log(`Fetched ${optionsData?.length || 0} demographic options`);
              
              // Combine the demographic data with its options
              const combinedData = {
                ...demographicData,
                options: optionsData || []
              };
              
              setQuestionTypeData([combinedData]);
            }
          }
        } else {
          // Standard handling for other question types
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
  
  // Handle liking a comment
  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    const userEmail = session?.user?.email;
    if (!userEmail) {
      toast.error('You must be logged in to like a comment');
      return;
    }
    
    setLikingComment(true);
    
    try {
      // Set the app user context for RLS policies
      await supabase.rpc('set_app_user', { p_email: userEmail });
      
      // Get user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();
        
      if (userError) {
        console.error('Error getting user ID:', userError);
        toast.error('Failed to identify user');
        return;
      }
      
      // Optimistically update the UI
      setComments(prevComments => {
        return prevComments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              like_count: isLiked ? (comment.like_count || 0) - 1 : (comment.like_count || 0) + 1,
              user_has_liked: !isLiked
            };
          } else if (comment.replies) {
            // Check in replies
            return {
              ...comment,
              replies: comment.replies.map(reply => {
                if (reply.id === commentId) {
                  return {
                    ...reply,
                    like_count: isLiked ? (reply.like_count || 0) - 1 : (reply.like_count || 0) + 1,
                    user_has_liked: !isLiked
                  };
                }
                return reply;
              })
            };
          }
          return comment;
        });
      });
      
      if (isLiked) {
        // Unlike the comment
        const { error: unlikeError } = await supabase
          .from('comment_likes')
          .delete()
          .eq('user_id', userData.id)
          .eq('comment_id', commentId);
          
        if (unlikeError) {
          console.error('Error unliking comment:', unlikeError);
          toast.error('Failed to unlike comment');
          // Revert the optimistic update
          fetchComments();
          return;
        }
        
        // Update the like count in the comments table
        await supabase.rpc('decrement_comment_like', { comment_id: commentId });
      } else {
        // Like the comment
        const { error: likeError } = await supabase
          .from('comment_likes')
          .insert({
            user_id: userData.id,
            comment_id: commentId,
            created_at: new Date().toISOString()
          });
          
        if (likeError) {
          console.error('Error liking comment:', likeError);
          toast.error('Failed to like comment');
          // Revert the optimistic update
          fetchComments();
          return;
        }
        
        // Update the like count in the comments table
        await supabase.rpc('increment_comment_like', { comment_id: commentId });
      }
    } catch (err) {
      console.error('Error in handleLikeComment:', err);
      toast.error('An unexpected error occurred');
      // Revert the optimistic update
      fetchComments();
    } finally {
      setLikingComment(false);
    }
  };
  
  // Handle posting a comment
  const handlePostComment = async () => {
    const userEmail = session?.user?.email;
    if (!userEmail) {
      toast.error('You must be logged in to post a comment');
      return;
    }
    
    if (!newComment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    
    setPostingComment(true);
    
    try {
      // Set the app user context for RLS policies
      await supabase.rpc('set_app_user', { p_email: userEmail });
      
      let mediaUploadUrl = null;
      
      // If there's a media file, upload it first
      if (mediaFile && selectedMediaType) {
        const timestamp = new Date().getTime();
        const fileExt = mediaFile.name.split('.').pop();
        const filePath = `comments/${timestamp}_${mediaFile.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('public')
          .upload(filePath, mediaFile);
          
        if (uploadError) {
          console.error('Error uploading media:', uploadError);
          toast.error('Failed to upload media');
          return;
        }
        
        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = await supabase.storage
          .from('public')
          .getPublicUrl(filePath);
          
        mediaUploadUrl = publicUrl;
      }
      
      // Get user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();
        
      if (userError) {
        console.error('Error getting user ID:', userError);
        toast.error('Failed to identify user');
        return;
      }
      
      // Insert comment into database
      const { data: newCommentData, error: commentError } = await supabase
        .from('comments')
        .insert({
          question_id: question.id,
          user_id: userData.id,
          content: newComment,
          media_type: selectedMediaType,
          file_url: mediaUploadUrl,
          created_at: new Date().toISOString(),
          parent_id: replyingTo ? replyingTo.id : null // Add parent_id for replies
        })
        .select('*')
        .single();
        
      if (commentError) {
        console.error('Error posting comment:', commentError);
        toast.error('Failed to post comment');
        return;
      }
      
      // Clear the form
      setNewComment('');
      setSelectedMediaType(null);
      setMediaUrl(null);
      setMediaFile(null);
      setReplyingTo(null); // Clear reply state
      
      // Refresh comments
      fetchComments();
      
      // Update comment count in the question
      await supabase.rpc('increment_comment_count', { question_id: question.id });
      
      toast.success(replyingTo ? 'Reply posted successfully' : 'Comment posted successfully');
    } catch (err) {
      console.error('Error in handlePostComment:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setPostingComment(false);
    }
  };
  
  // Handle reply to comment
  const handleReplyToComment = (comment: Comment) => {
    setReplyingTo(comment);
    // Focus on the comment input
    const commentInput = document.getElementById('comment-input');
    if (commentInput) {
      commentInput.focus();
    }
  };

  if (!isOpen) return null;
  
  // Helper functions for community answers
  const getTotalResponses = () => {
    return Object.values(communityAnswers).reduce((sum, count) => sum + count, 0);
  };

  const getPercentage = (count: number) => {
    const total = getTotalResponses();
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };
  
  // Get unique family member count (latest response per user)
  const getUniqueFamilyResponses = () => {
    // Create a map to only keep the latest answer per user
    const latestAnswerByUser = new Map();
    userAnswers.forEach(answer => {
      if (!latestAnswerByUser.has(answer.user.id) || 
          new Date(answer.created_at) > new Date(latestAnswerByUser.get(answer.user.id).created_at)) {
        latestAnswerByUser.set(answer.user.id, answer);
      }
    });
    return latestAnswerByUser.size;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-auto bg-[#121212] border-gray-800 text-white [&>button]:hidden">
        <DialogTitle className="sr-only">
          Question Details: {question.question}
        </DialogTitle>
        
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
            className="rounded-full h-9 w-9 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center" 
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
          
          {/* Tabs for Your Answer and Community Answers */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
            <TabsList className="grid w-full grid-cols-2 bg-[#2a2d35]">
              <TabsTrigger value="your-answer">Your Answer</TabsTrigger>
              <TabsTrigger value="community-answers">Family Answers</TabsTrigger>
            </TabsList>
            
            <TabsContent value="your-answer" className="mt-4">
              <div className={`space-y-4 border ${userExistingAnswer ? 'border-green-600' : 'border-gray-800'} rounded-lg p-4 bg-[#111318] relative`}>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Your Answer</h3>
                  <div className="flex items-center gap-2">
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
                    {userExistingAnswer && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2 h-8 text-red-400 border-red-800 hover:bg-red-900/20 hover:text-red-300"
                        onClick={handleResetAnswer}
                        disabled={resettingAnswer}
                      >
                        {resettingAnswer ? (
                          <div className="w-4 h-4 border-2 border-t-transparent border-red-400 rounded-full animate-spin mr-1"></div>
                        ) : null}
                        Reset
                      </Button>
                    )}
                  </div>
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
                  // Log for debugging
                  console.log('Comparing option:', option.option_text, 'with answer:', answer);
                  
                  // Check if this option is selected in the current form
                  const isSelected = option.option_text === answer;
                  
                  // Check if this was the user's last saved answer
                  const isLastAnswer = userExistingAnswer && isSelected;
                  
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

            {/* Demographic Question */}
            {question.type === 'demographic' && (
              <div className="space-y-3">
                <div className="relative bg-[#111318] border border-gray-700 rounded-lg p-4">
                  <div className="text-sm text-blue-400 mb-2 font-medium">Demographic Field</div>
                  {userExistingAnswer && answer && (
                    <div className="text-xs font-medium text-green-400 bg-green-900/50 px-2 py-1 rounded-full inline-block mb-2">
                      Last answer: {answer}
                    </div>
                  )}
                  
                  {/* Fetch demographic options from the API or use fallback options */}
                  <div className="space-y-2 mt-3">
                    {/* If we have options from the API, use those */}
                    {questionTypeData.length > 0 && questionTypeData[0].options ? (
                      // Display the options from the combined data structure
                      questionTypeData[0].options.map((option: any, index: number) => {
                        const isSelected = option.option_text === answer;
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
                      })
                    ) : (
                      /* Fallback options if no data from API */
                      <div className="text-center text-gray-400 p-4 border border-dashed border-gray-700 rounded-lg">
                        <Database className="h-6 w-6 mx-auto mb-2 text-gray-500" />
                        <p>No demographic options available.</p>
                        <p className="text-xs mt-1">Please select an option below:</p>
                        
                        {/* Fallback options based on question text */}
                        <div className="mt-4 space-y-2">
                          {question.question.toLowerCase().includes('age') && (
                            ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65 or older", "Prefer not to say"].map((option, index) => {
                              const isSelected = option === answer;
                              return (
                                <div 
                                  key={index} 
                                  className={`p-3 rounded-lg border flex items-center justify-between
                                    ${isSelected ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-800 border-gray-700 hover:border-gray-600'}
                                    cursor-pointer transition-colors`}
                                  onClick={() => setAnswer(option)}
                                >
                                  <span>{option}</span>
                                  {isSelected && (
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center bg-blue-500">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                          
                          {question.question.toLowerCase().includes('gender') && (
                            ["Male", "Female", "Non-binary", "Prefer to self-describe", "Prefer not to say"].map((option, index) => {
                              const isSelected = option === answer;
                              return (
                                <div 
                                  key={index} 
                                  className={`p-3 rounded-lg border flex items-center justify-between
                                    ${isSelected ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-800 border-gray-700 hover:border-gray-600'}
                                    cursor-pointer transition-colors`}
                                  onClick={() => setAnswer(option)}
                                >
                                  <span>{option}</span>
                                  {isSelected && (
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center bg-blue-500">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                          
                          {question.question.toLowerCase().includes('live') && (
                            ["Urban area", "Suburban area", "Rural area", "Small town", "Large city", "Prefer not to say"].map((option, index) => {
                              const isSelected = option === answer;
                              return (
                                <div 
                                  key={index} 
                                  className={`p-3 rounded-lg border flex items-center justify-between
                                    ${isSelected ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-800 border-gray-700 hover:border-gray-600'}
                                    cursor-pointer transition-colors`}
                                  onClick={() => setAnswer(option)}
                                >
                                  <span>{option}</span>
                                  {isSelected && (
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center bg-blue-500">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                          
                          {/* Default options if question doesn't match any known categories */}
                          {!question.question.toLowerCase().includes('age') && 
                           !question.question.toLowerCase().includes('gender') &&
                           !question.question.toLowerCase().includes('live') && (
                            ["Option 1", "Option 2", "Option 3", "Option 4", "Prefer not to say"].map((option, index) => {
                              const isSelected = option === answer;
                              return (
                                <div 
                                  key={index} 
                                  className={`p-3 rounded-lg border flex items-center justify-between
                                    ${isSelected ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-800 border-gray-700 hover:border-gray-600'}
                                    cursor-pointer transition-colors`}
                                  onClick={() => setAnswer(option)}
                                >
                                  <span>{option}</span>
                                  {isSelected && (
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center bg-blue-500">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
                  // Get user email from NextAuth session
                  const userEmail = session?.user?.email;
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
                    console.error('Answer submission failed:', answerError);
                    setSubmitError(answerError.message);
                    return;
                  }
                  
                  console.log('Answer submitted successfully:', data);
                  toast.success('Your answer has been submitted!');
                  
                  // Update the existing answer in state
                  setUserExistingAnswer(data);
                  
                  // Refresh community answers without closing the modal
                  calculateCommunityAnswers();
                  
                  // Switch to the community answers tab to show the impact of the user's answer
                  setActiveTab('community-answers');
                } catch (err) {
                  console.error('Error in answer submission:', err);
                  setSubmitError('An unexpected error occurred. Please try again.');
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? 'Submitting...' : userExistingAnswer ? 'Update Answer' : 'Submit Answer'}
            </Button>
          </div>
            </TabsContent>
            
            <TabsContent value="community-answers" className="mt-4">
              <div className="rounded-md border border-gray-700 p-4 bg-[#111318]">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium">Family Responses</h4>
                  <Badge variant="outline" className="bg-blue-900/20 text-blue-400 border-blue-800">
                    {getUniqueFamilyResponses()} Family Members
                  </Badge>
                </div>
                
                {/* Response Distribution with Family Member Answers */}
                {question.type === 'multiple-choice' && questionTypeData.length > 0 && (
                  <div className="space-y-6">
                    {questionTypeData.map((option, index) => {
                      const count = communityAnswers[option.option_text || ''] || 0;
                      const percentage = getPercentage(count);
                      
                      // Find family members who selected this option
                      const familyMembersWithThisAnswer = userAnswers.filter(answer => {
                        if (typeof answer.answer_data === 'string') {
                          return answer.answer_data === option.option_text;
                        } else if (Array.isArray(answer.answer_data)) {
                          return answer.answer_data.includes(option.option_text);
                        } else if (answer.answer_data && typeof answer.answer_data === 'object') {
                          return Object.values(answer.answer_data).includes(option.option_text);
                        }
                        return false;
                      });
                      
                      // Create a map to only keep the latest answer per user
                      const latestAnswerByUser = new Map();
                      familyMembersWithThisAnswer.forEach(answer => {
                        if (!latestAnswerByUser.has(answer.user.id) || 
                            new Date(answer.created_at) > new Date(latestAnswerByUser.get(answer.user.id).created_at)) {
                          latestAnswerByUser.set(answer.user.id, answer);
                        }
                      });
                      
                      return (
                        <div key={index} className="space-y-2 pb-4 border-b border-gray-800">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{option.option_text}</span>
                            <span>
                              {count} ({percentage}%)
                            </span>
                          </div>
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-3">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          
                          {/* Family members who selected this option */}
                          {latestAnswerByUser.size > 0 && (
                            <div className="pl-2 border-l-2 border-gray-700">
                              <p className="text-xs text-gray-400 mb-2">Family members who selected this option:</p>
                              <div className="flex flex-wrap gap-2">
                                {Array.from(latestAnswerByUser.values()).map((answer, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-1.5 bg-[#2a2d35] px-2 py-1 rounded-md"
                                  >
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="bg-blue-900 text-blue-100 text-[10px]">
                                        {answer.user.first_name?.[0] || answer.user.email?.[0] || '?'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs">
                                      {answer.user.first_name} {answer.user.last_name}
                                      <span className="text-xs text-gray-400 ml-1">
                                        ({answer.user.role || 'Member'})
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* For non-multiple choice questions */}
                {question.type !== 'multiple-choice' && (
                  <div>
                  
                    
                    {userAnswers.length > 0 ? (
                      <div className="space-y-3">
                        {/* Group answers by user and only show the latest */}
                        {(() => {
                          const latestAnswerByUser = new Map();
                          userAnswers.forEach(answer => {
                            if (!latestAnswerByUser.has(answer.user.id) || 
                                new Date(answer.created_at) > new Date(latestAnswerByUser.get(answer.user.id).created_at)) {
                              latestAnswerByUser.set(answer.user.id, answer);
                            }
                          });
                          
                          return Array.from(latestAnswerByUser.values()).map((answer, index) => {
                            // Format the answer for display
                            let displayAnswer = '';
                            if (typeof answer.answer_data === 'string') {
                              displayAnswer = answer.answer_data;
                            } else if (Array.isArray(answer.answer_data)) {
                              displayAnswer = answer.answer_data.join(', ');
                            } else if (answer.answer_data && typeof answer.answer_data === 'object') {
                              displayAnswer = JSON.stringify(answer.answer_data);
                            }
                            
                            return (
                              <div key={index} className="p-3 bg-[#1e2330] rounded-md border border-gray-700">
                                <div className="flex items-center gap-2 mb-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="bg-blue-900 text-blue-100">
                                      {answer.user.first_name?.[0] || answer.user.email?.[0] || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">
                                      {answer.user.first_name} {answer.user.last_name}
                                      <span className="text-xs text-gray-400 ml-1">
                                        ({answer.user.role || 'Member'})
                                      </span>
                                    </span>
                                  </div>
                                </div>
                                <div className="pl-8">
                                  <p className="text-sm text-gray-300">{displayAnswer}</p>
                                </div>
                              </div>
                            );
                          });
                        })()} 
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-4 border border-dashed border-gray-700 rounded-md">
                        No family responses yet. Be the first to answer!
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Comments section with improved UI */}
          <div className="mt-8 bg-[#111318] rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-medium mb-4 text-blue-300">Discussion</h3>
            
            {/* Custom comment input */}
            <div className="mb-6">
              <Input
                id="comment-input"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? `Reply to ${replyingTo.user?.first_name}...` : "Add a comment..."}
                className="flex-1 bg-[#1e2330] border-gray-700 text-white placeholder:text-gray-500"
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
                <Button 
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
                </Button>
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
                <div className="flex flex-col space-y-4 mt-4">
                  {replyingTo && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div className="flex items-center space-x-2">
                        <MessageSquareReply className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Replying to {replyingTo.user?.first_name || 'Unknown'}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  {commentsLoading ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : comments.length > 0 ? (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex flex-col space-y-2 p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {comment.user?.first_name?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">
                                  {comment.user?.first_name || 'Unknown'} {comment.user?.last_name || 'User'}
                                </span>
                                <Badge variant="outline" className="text-xs px-1">
                                  {comment.user?.role || 'User'}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(comment.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-sm">{comment.content}</div>
                        
                        {comment.media_type && comment.file_url && (
                          <div className="mt-2">
                            {comment.media_type === 'image' && (
                              <img 
                                src={comment.file_url} 
                                alt="Comment attachment" 
                                className="max-h-48 rounded-md object-contain"
                              />
                            )}
                            {comment.media_type === 'video' && (
                              <video 
                                src={comment.file_url} 
                                controls 
                                className="max-h-48 w-full rounded-md"
                              />
                            )}
                            {comment.media_type === 'audio' && (
                              <audio 
                                src={comment.file_url} 
                                controls 
                                className="w-full rounded-md"
                              />
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-4 mt-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="flex items-center space-x-1 h-8 px-2"
                            onClick={() => handleLikeComment(comment.id, comment.user_has_liked || false)}
                            disabled={likingComment}
                          >
                            {comment.user_has_liked ? (
                              <HeartFilled className="h-4 w-4 text-red-500" />
                            ) : (
                              <Heart className="h-4 w-4" />
                            )}
                            <span className="text-xs">{comment.like_count || 0}</span>
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="flex items-center space-x-1 h-8 px-2"
                            onClick={() => handleReplyToComment(comment)}
                          >
                            <MessageSquareReply className="h-4 w-4" />
                            <span className="text-xs">Reply</span>
                          </Button>
                        </div>
                        
                        {/* Replies section */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="pl-4 border-l-2 border-muted mt-2 space-y-3">
                            {comment.replies.map(reply => (
                              <div key={reply.id} className="flex flex-col space-y-2 p-2 bg-background/50 rounded-lg">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-xs">
                                        {reply.user?.first_name?.[0] || 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium text-sm">
                                          {reply.user?.first_name || 'Unknown'} {reply.user?.last_name || 'User'}
                                        </span>
                                        <Badge variant="outline" className="text-xs px-1">
                                          {reply.user?.role || 'User'}
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {formatDate(reply.created_at)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-sm">{reply.content}</div>
                                
                                {reply.media_type && reply.file_url && (
                                  <div className="mt-2">
                                    {reply.media_type === 'image' && (
                                      <img 
                                        src={reply.file_url} 
                                        alt="Reply attachment" 
                                        className="max-h-36 rounded-md object-contain"
                                      />
                                    )}
                                    {reply.media_type === 'video' && (
                                      <video 
                                        src={reply.file_url} 
                                        controls 
                                        className="max-h-36 w-full rounded-md"
                                      />
                                    )}
                                    {reply.media_type === 'audio' && (
                                      <audio 
                                        src={reply.file_url} 
                                        controls 
                                        className="w-full rounded-md"
                                      />
                                    )}
                                  </div>
                                )}
                                
                                <div className="flex items-center space-x-4 mt-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="flex items-center space-x-1 h-6 px-2"
                                    onClick={() => handleLikeComment(reply.id, reply.user_has_liked || false)}
                                    disabled={likingComment}
                                  >
                                    {reply.user_has_liked ? (
                                      <HeartFilled className="h-3 w-3 text-red-500" />
                                    ) : (
                                      <Heart className="h-3 w-3" />
                                    )}
                                    <span className="text-xs">{reply.like_count || 0}</span>
                                  </Button>
                                  
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="flex items-center space-x-1 h-6 px-2"
                                    onClick={() => handleReplyToComment(comment)}
                                  >
                                    <MessageSquareReply className="h-3 w-3" />
                                    <span className="text-xs">Reply</span>
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground p-4">
                      No comments yet. Be the first to comment!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
