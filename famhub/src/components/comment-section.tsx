'use client';

import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Heart, Reply, Send, Mic, FileIcon, Image as ImageIcon, Video, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";

// Update the MediaRecorderErrorEvent type
interface MediaRecorderError extends DOMException {
  name: string;
  message: string;
}

interface CommentSectionProps {
  questionId: string;
}

interface CommentLike {
  user_id: string;
}

interface CommentType {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  question_id: string;
  like_count: number;
  parent_id: string | null;
  file_url: string | null;
  media_type: 'image' | 'video' | 'audio' | null;
  folder_path: string | null;
  user: {
    first_name: string;
    last_name: string;
    role: string;
  };
  has_liked?: boolean;
  comment_likes?: CommentLike[];
}

// Define type for recording modes
type RecordingMode = 'upload' | 'record';
// Define type for media types
type MediaType = 'image' | 'video' | 'audio' | null;
// Define type for tab options
type TabType = 'text' | 'image' | 'video' | 'audio' | 'file';

const MAX_RECORDING_DURATION = 60000; // 60 seconds
const SUPPORTED_MIME_TYPES = {
  video: ['video/webm', 'video/mp4'],
  audio: ['audio/webm', 'audio/mp3', 'audio/wav']
};

export function CommentSection({ questionId }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('upload');
  const [videoRecordingMode, setVideoRecordingMode] = useState<RecordingMode>('upload');
  const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string | null>(null);
  const [showMicrophoneSelection, setShowMicrophoneSelection] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string | null>(null);
  const [showCameraSelection, setShowCameraSelection] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);

  // Get current user from sessionStorage
  const getUserEmail = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('userEmail');
    }
    return null;
  };

  const initializeMediaDevices = async () => {
    try {
      // Request permissions for both audio and video
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      // Stop the stream immediately after getting permissions
      stream.getTracks().forEach(track => track.stop());
      
      // Now enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const mics = devices.filter(device => device.kind === 'audioinput');
      const cameras = devices.filter(device => device.kind === 'videoinput');
      
      console.log('Available microphones:', mics);
      console.log('Available cameras:', cameras);
      
      setAvailableMicrophones(mics);
      setAvailableCameras(cameras);
      
      // Set default devices if available
      if (mics.length > 0) setSelectedMicrophone(mics[0].deviceId);
      if (cameras.length > 0) setSelectedVideoDevice(cameras[0].deviceId);
      
    } catch (err) {
      console.error('Error initializing media devices:', err);
      setError(`Media device initialization failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const checkBrowserSupport = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Your browser does not support media recording. Please try a modern browser like Chrome, Firefox, or Edge.');
    }
    
    // Check for MediaRecorder support
    if (!window.MediaRecorder) {
      throw new Error('Your browser does not support MediaRecorder. Please try a modern browser.');
    }
    
    // Check MIME type support
    const supportedVideoType = SUPPORTED_MIME_TYPES.video.find(type => MediaRecorder.isTypeSupported(type));
    const supportedAudioType = SUPPORTED_MIME_TYPES.audio.find(type => MediaRecorder.isTypeSupported(type));
    
    if (!supportedVideoType || !supportedAudioType) {
      throw new Error('Your browser does not support the required media formats.');
    }
    
    return { supportedVideoType, supportedAudioType };
  };

  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get current user
      const userEmail = getUserEmail();
      if (!userEmail) {
        throw new Error('User not logged in');
      }

      // Get user from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }

      // Fetch comments with likes information using LEFT JOIN instead of INNER JOIN
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:users!comments_user_id_fkey (first_name, last_name, role),
          comment_likes (user_id)
        `)
        .eq('question_id', questionId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      // Process the comments to add has_liked field
      const processedComments = (data || []).map(comment => ({
        ...comment,
        has_liked: comment.comment_likes?.some((like: { user_id: string }) => like.user_id === userData.id) || false
      }));

      setComments(processedComments);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (questionId) {
      fetchComments();

      // Set up real-time subscription
      const subscription = supabase
        .channel('comments-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'comments', filter: `question_id=eq.${questionId}` },
          (payload) => {
            fetchComments();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [questionId]);

  useEffect(() => {
    initializeMediaDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', initializeMediaDevices);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', initializeMediaDevices);
    };
  }, []);

  useEffect(() => {
    if (videoRecordingMode === 'record' && !showCameraSelection && availableCameras.length === 0) {
      getAvailableCameras();
    }
  }, [videoRecordingMode, showCameraSelection, availableCameras.length]);

  const handleLike = async (commentId: string) => {
    try {
      // Get current user
      const userEmail = getUserEmail();
      if (!userEmail) {
        setError('You must be logged in to like comments');
        return;
      }

      // Get user from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }

      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;

      // Optimistic update
      setComments(comments.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            like_count: c.has_liked ? c.like_count - 1 : c.like_count + 1,
            has_liked: !c.has_liked
          };
        }
        return c;
      }));

      if (comment.has_liked) {
        // Unlike the comment
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', userData.id);

        if (error) throw error;

        // Update comment like count
        await supabase
          .from('comments')
          .update({ like_count: comment.like_count - 1 })
          .eq('id', commentId);
      } else {
        // Like the comment
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: userData.id
          });

        if (error) throw error;

        // Update comment like count
        await supabase
          .from('comments')
          .update({ like_count: comment.like_count + 1 })
          .eq('id', commentId);
      }
    } catch (err) {
      console.error('Error handling like:', err);
      setError('Failed to update like. Please try again.');
      // Revert optimistic update
      fetchComments();
    }
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(replyingTo === commentId ? null : commentId);
    setReplyText("");
  };

  const submitReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    
    try {
      // Get current user
      const userEmail = getUserEmail();
      if (!userEmail) {
        setError('You must be logged in to reply');
        return;
      }

      // Get user from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }

      // Create reply
      const { error } = await supabase
        .from('comments')
        .insert({
          content: replyText,
          user_id: userData.id,
          question_id: questionId,
          parent_id: commentId,
          like_count: 0
        });

      if (error) {
        throw error;
      }

      // Update comment count on question
      await supabase
        .from('questions')
        .update({ comment_count: comments.length + 1 })
        .eq('id', questionId);

      setReplyingTo(null);
      setReplyText("");
      fetchComments();
    } catch (err) {
      console.error('Error submitting reply:', err);
      setError('Failed to submit reply. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const startVideoRecording = async () => {
    try {
      const { supportedVideoType } = checkBrowserSupport();
      
      if (!selectedVideoDevice) {
        throw new Error("No camera selected");
      }

      console.log("Starting video recording with device:", selectedVideoDevice);
      
      const constraints = {
        audio: selectedMicrophone ? { deviceId: { exact: selectedMicrophone } } : true,
        video: {
          deviceId: { exact: selectedVideoDevice },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      };

      console.log("Using video constraints:", constraints);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setVideoStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true;
        
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve();
          }
        });
        
        await videoRef.current.play();
      }
      
      setIsVideoRecording(true);
      
      const videoChunks: Blob[] = [];
      const recorder = new MediaRecorder(mediaStream, {
        mimeType: supportedVideoType,
        videoBitsPerSecond: 2500000
      });
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunks.push(e.data);
          console.log("Video chunk collected, size:", e.data.size);
        }
      };
      
      recorder.onstop = () => {
        console.log("Video recording stopped");
        const blob = new Blob(videoChunks, { type: supportedVideoType });
        console.log("Video blob created, size:", blob.size);
        
        const url = URL.createObjectURL(blob);
        setVideoPreviewUrl(url);
        setVideoBlob(blob);
        
        // Clean up resources
        if (videoStream) {
          videoStream.getTracks().forEach(track => track.stop());
        }
        setVideoStream(null);
        setIsVideoRecording(false);
        
        // Clean up object URL when component unmounts
        return () => {
          URL.revokeObjectURL(url);
        };
      };
      
      recorder.onerror = function(this: MediaRecorder, event: Event) {
        const errorEvent = event as Event & { error: MediaRecorderError };
        console.error("Video MediaRecorder error:", errorEvent);
        setError("Video recording failed: " + errorEvent.error.message);
        cleanupMediaResources();
      };
      
      recorder.start(1000);
      videoRecorderRef.current = recorder;
      
      // Set maximum recording duration
      setTimeout(() => {
        if (recorder.state === 'recording') {
          console.log("Reached maximum recording duration");
          recorder.stop();
        }
      }, MAX_RECORDING_DURATION);
      
    } catch (err) {
      console.error("Error in startVideoRecording:", err);
      setError(`Video recording failed: ${err instanceof Error ? err.message : String(err)}`);
      setIsVideoRecording(false);
      cleanupMediaResources();
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorderRef.current && videoRecorderRef.current.state !== "inactive") {
      console.log("Stopping video recording");
      videoRecorderRef.current.stop();
    }
  };

  const startAudioRecording = async () => {
    try {
      if (!selectedMicrophone) {
        throw new Error("No microphone selected");
      }

      console.log("Starting audio recording with device:", selectedMicrophone);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          deviceId: { exact: selectedMicrophone },
          echoCancellation: true,
          noiseSuppression: true
        },
        video: false
      });
      
      console.log("Audio stream obtained:", stream);
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          console.log("Audio chunk collected, size:", e.data.size);
        }
      };
      
      recorder.onstop = () => {
        console.log("Audio recording stopped");
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log("Audio blob created, size:", blob.size);
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.onerror = function(this: MediaRecorder, event: Event) {
        const errorEvent = event as Event & { error: MediaRecorderError };
        console.error("MediaRecorder error:", errorEvent);
        setError("Recording failed: " + errorEvent.error.message);
      };
      
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      
    } catch (err) {
      console.error("Error in startAudioRecording:", err);
      setError(`Audio recording failed: ${err instanceof Error ? err.message : String(err)}`);
      setIsRecording(false);
    }
  };

  const getAvailableMicrophones = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const microphones = devices.filter(device => device.kind === 'audioinput');
      setAvailableMicrophones(microphones);
      
      // Set default microphone if available
      if (microphones.length > 0 && !selectedMicrophone) {
        setSelectedMicrophone(microphones[0].deviceId);
      }
      
      setShowMicrophoneSelection(true);
    } catch (err) {
      console.error('Error getting microphones:', err);
      setError('Could not get microphone list. Please check your permissions.');
    }
  };

  const getAvailableCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(cameras);
      
      // Set default camera if available
      if (cameras.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(cameras[0].deviceId);
      }
      
      setShowCameraSelection(true);
    } catch (err) {
      console.error('Error getting cameras:', err);
      setError('Could not get camera list. Please check your permissions.');
    }
  };

  const submitComment = async () => {
    if (submitting) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      if (!newComment.trim() && !selectedFile && !audioBlob && !videoBlob) {
        setError("Please enter a comment or attach media");
        setSubmitting(false);
        return;
      }
      
      // Get user session
      const userEmail = sessionStorage.getItem("userEmail");
      if (!userEmail) {
        setError("You must be logged in to comment");
        setSubmitting(false);
        return;
      }
      
      // Get user details for folder path
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, role')
        .eq('email', userEmail)
        .single();
      
      if (userError || !userData) {
        console.error("Error fetching user data:", userError);
        setError("Could not retrieve user information");
        setSubmitting(false);
        return;
      }
      
      // Determine folder path based on role following the established pattern
      const persona = userData.role === 'Father' || userData.role === 'Mother' || 
                     userData.role === 'Grandfather' || userData.role === 'Grandmother' 
                     ? 'Parent' : 'Children';
      
      let fileUrl = '';
      let folderPath = '';
      let mediaType: MediaType = null;
      
      // Handle file upload if there's a file
      if (selectedFile || audioBlob || videoBlob) {
        try {
          const timestamp = new Date().getTime();
          let file: File;
          
          if (selectedFile) {
            file = selectedFile;
            // Determine media type based on file type
            const fileType = selectedFile.type.split('/')[0];
            if (fileType === 'image') {
              mediaType = 'image';
            } else if (fileType === 'video') {
              mediaType = 'video';
            } else if (fileType === 'audio') {
              mediaType = 'audio';
            } else {
              // For other file types, don't set a media_type
              mediaType = null;
            }
          } else if (audioBlob) {
            file = new File([audioBlob], `audio_${timestamp}.webm`, { type: 'audio/webm' });
            mediaType = 'audio';
          } else if (videoBlob) {
            file = new File([videoBlob], `video_${timestamp}.webm`, { type: 'video/webm' });
            mediaType = 'video';
          } else {
            throw new Error("No file to upload");
          }
          
          const fileName = `${timestamp}_${file.name}`;
          
          console.log("Preparing file upload with user data:", {
            lastName: userData.last_name,
            firstName: userData.first_name,
            role: userData.role,
            persona,
            fileName
          });
          
          // Create FormData for native file upload
          const formData = new FormData();
          formData.append('file', file);
          formData.append('lastName', userData.last_name);
          formData.append('firstName', userData.first_name);
          formData.append('role', userData.role);
          formData.append('persona', persona);
          formData.append('fileName', fileName);
          
          // Use fetch to upload to your API endpoint
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });
          
          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            console.error("File upload error:", errorData);
            throw new Error(`File upload failed: ${JSON.stringify(errorData)}`);
          }
          
          const uploadResult = await uploadResponse.json();
          // Get the URL and folderPath from the response
          fileUrl = uploadResult.url;
          folderPath = uploadResult.folderPath;
          
          console.log("File uploaded successfully:", {
            url: fileUrl,
            path: folderPath,
            type: mediaType
          });
        } catch (fileError) {
          console.error("File handling error:", fileError);
          setError(`File processing failed: ${fileError instanceof Error ? fileError.message : JSON.stringify(fileError)}`);
          setSubmitting(false);
          return;
        }
      }
      
      // Create comment in database
      const commentData = {
        user_id: userData.id,
        question_id: questionId,
        content: newComment,
        parent_id: replyingTo,
        file_url: fileUrl || null,
        folder_path: folderPath || null,
        media_type: mediaType,
        like_count: 0
      };
      
      console.log("Creating comment with data:", commentData);
      
      try {
        // Set the user context for RLS policies
        await supabase.auth.setSession({
          access_token: sessionStorage.getItem('supabase.auth.token') || '',
          refresh_token: ''
        });
        
        const { data: insertData, error: insertError } = await supabase
          .from('comments')
          .insert(commentData)
          .select();
        
        console.log("Insert response:", { data: insertData, error: insertError });
        
        if (insertError) {
          console.error("Error creating comment:", insertError);
          setError(`Failed to post comment: ${insertError.message}`);
          setSubmitting(false);
          return;
        }
        
        // Reset form
        setNewComment("");
        setReplyingTo(null);
        setReplyText("");
        setSelectedFile(null);
        setAudioBlob(null);
        setVideoBlob(null);
        setVideoPreviewUrl(null);
        setActiveTab("text");
        
        // Fetch updated comments
        fetchComments();
        
      } catch (err) {
        console.error("Error submitting comment:", err);
        setError(`An unexpected error occurred: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
      } finally {
        setSubmitting(false);
      }
    } catch (err) {
      console.error("Error submitting comment:", err);
      setError(`An unexpected error occurred: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Group comments by parent_id
  const parentComments = comments.filter(comment => !comment.parent_id);
  const childComments = comments.filter(comment => comment.parent_id);

  const getCommentReplies = (commentId: string) => {
    return childComments.filter(comment => comment.parent_id === commentId);
  };

  // Media preview component
  const MediaPreview = ({ type, url }: { type: 'image' | 'video' | 'audio' | null; url: string | null }) => {
    if (!url) return null;
    
    switch (type) {
      case 'image':
        return (
          <div className="relative w-full h-48 bg-gray-100 rounded-md overflow-hidden">
            <Image src={url} alt="Image" fill style={{ objectFit: 'contain' }} />
          </div>
        );
      case 'video':
        return (
          <video 
            src={url} 
            controls 
            className="w-full rounded-md" 
            style={{ maxHeight: '300px' }}
          />
        );
      case 'audio':
        return (
          <audio src={url} controls className="w-full mt-2" />
        );
      default:
        return (
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-2 text-blue-600 hover:underline"
          >
            <FileIcon className="w-4 h-4" />
            Download File
          </a>
        );
    }
  };

  const cleanupMediaResources = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
    
    setVideoBlob(null);
    setIsVideoRecording(false);
  };

  useEffect(() => {
    return () => {
      cleanupMediaResources();
    };
  }, []);

  if (loading) {
    return <div className="py-4 text-center">Loading comments...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Comments</h3>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="border rounded-lg overflow-hidden">
        <div className="p-4">
          {activeTab === 'text' && (
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px]"
            />
          )}
          
          {activeTab === 'audio' && (
            <div className="flex flex-col gap-4">
              {recordingMode === 'upload' ? (
                <div className="w-full">
                  <input
                    type="file"
                    id="audioFile"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      // Validate file size (5MB limit)
                      if (file.size > 5 * 1024 * 1024) {
                        setError('File size must be less than 5MB');
                        return;
                      }
                      
                      // Validate file type based on active tab
                      const fileType = file.type.split('/')[0];
                      if ((activeTab as 'image' | 'video' | 'audio') === 'image' && fileType !== 'image') {
                        setError('Please select an image file');
                        return;
                      } else if ((activeTab as 'image' | 'video' | 'audio') === 'video' && fileType !== 'video') {
                        setError('Please select a video file');
                        return;
                      } else if ((activeTab as 'image' | 'video' | 'audio') === 'audio' && fileType !== 'audio') {
                        setError('Please select an audio file');
                        return;
                      }
                      
                      setSelectedFile(file);
                      setError(null);
                    }}
                  />
                  <label
                    htmlFor="audioFile"
                    className="flex items-center justify-center w-full py-4 border border-dashed rounded-md cursor-pointer hover:bg-gray-50"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FileIcon className="w-6 h-6 text-gray-400" />
                      <span className="text-sm text-gray-500">Upload Audio</span>
                    </div>
                  </label>
                  {selectedFile && (
                    <div className="mt-3">
                      <audio src={URL.createObjectURL(selectedFile)} controls className="w-full" />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedFile(null)} 
                        className="mt-2"
                      >
                        <X className="w-4 h-4" /> Remove
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full">
                  {showMicrophoneSelection && !isRecording && !audioBlob ? (
                    <div className="p-4 border rounded-md">
                      <h4 className="text-sm font-medium mb-2">Select Microphone</h4>
                      <select 
                        className="w-full p-2 border rounded-md mb-3"
                        value={selectedMicrophone || ''}
                        onChange={(e) => setSelectedMicrophone(e.target.value)}
                      >
                        {availableMicrophones.map((mic) => (
                          <option key={mic.deviceId} value={mic.deviceId}>
                            {mic.label || `Microphone ${mic.deviceId.slice(0, 5)}`}
                          </option>
                        ))}
                      </select>
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowMicrophoneSelection(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={startAudioRecording}
                        >
                          Start Recording
                        </Button>
                      </div>
                    </div>
                  ) : isRecording ? (
                    <div className="p-4 border rounded-md text-center">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <div className="w-8 h-8 bg-red-600 rounded-full animate-pulse"></div>
                      </div>
                      <p className="text-sm font-medium mb-2">Recording in progress...</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (mediaRecorderRef.current && isRecording) {
                            mediaRecorderRef.current.stop();
                            setIsRecording(false);
                          }
                        }}
                      >
                        Stop Recording
                      </Button>
                    </div>
                  ) : audioBlob ? (
                    <div className="p-4 border rounded-md">
                      <p className="text-sm font-medium mb-2">Preview Recording</p>
                      <audio src={URL.createObjectURL(audioBlob)} controls className="w-full mb-3" />
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setAudioBlob(null)}
                        >
                          Discard
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full py-4"
                      onClick={() => {
                        getAvailableMicrophones();
                      }}
                    >
                      <Mic className="w-5 h-5 mr-2" />
                      Record Audio
                    </Button>
                  )}
                </div>
              )}

              <div className="flex justify-center gap-4">
                <Button
                  variant={recordingMode === 'upload' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setRecordingMode('upload');
                    setAudioBlob(null);
                    setShowMicrophoneSelection(false);
                  }}
                >
                  Upload
                </Button>
                <Button
                  variant={recordingMode === 'record' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setRecordingMode('record');
                    setSelectedFile(null);
                  }}
                >
                  Record
                </Button>
              </div>
            </div>
          )}
          
          {activeTab === 'video' && (
            <div className="w-full">
              {videoRecordingMode === 'upload' && (
                <>
                  {!selectedFile ? (
                    <>
                      <div className="flex justify-between mb-2">
                        <div className="flex space-x-2">
                          <Button 
                            variant="secondary"
                            size="sm"
                            className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                            onClick={() => setVideoRecordingMode('upload')}
                          >
                            Upload
                          </Button>
                          <Button 
                            variant="ghost"
                            size="sm" 
                            onClick={() => {
                              setVideoRecordingMode('record');
                              getAvailableCameras();
                            }}
                          >
                            Record
                          </Button>
                        </div>
                      </div>
                      <input
                        type="file"
                        id="videoUpload"
                        className="hidden"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          // Validate file size (5MB limit)
                          if (file.size > 5 * 1024 * 1024) {
                            setError('File size must be less than 5MB');
                            return;
                          }
                          
                          // Validate file type based on active tab
                          const fileType = file.type.split('/')[0];
                          if ((activeTab as 'image' | 'video' | 'audio') === 'image' && fileType !== 'image') {
                            setError('Please select an image file');
                            return;
                          } else if ((activeTab as 'image' | 'video' | 'audio') === 'video' && fileType !== 'video') {
                            setError('Please select a video file');
                            return;
                          } else if ((activeTab as 'image' | 'video' | 'audio') === 'audio' && fileType !== 'audio') {
                            setError('Please select an audio file');
                            return;
                          }
                          
                          setSelectedFile(file);
                          setError(null);
                        }}
                      />
                      <label
                        htmlFor="videoUpload"
                        className="flex items-center justify-center w-full py-4 border border-dashed rounded-md cursor-pointer hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <Video className="w-6 h-6 text-gray-400" />
                          <span className="text-sm text-gray-500">Upload Video</span>
                        </div>
                      </label>
                    </>
                  ) : (
                    <div className="mt-2">
                      <video 
                        src={URL.createObjectURL(selectedFile)} 
                        controls 
                        className="w-full rounded-md" 
                        style={{ maxHeight: '300px' }}
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedFile(null)} 
                        className="mt-2"
                      >
                        <X className="w-4 h-4" /> Remove
                      </Button>
                    </div>
                  )}
                </>
              )}
              {videoRecordingMode === 'record' && (
                <>
                  {!videoBlob ? (
                    <>
                      <div className="flex justify-between mb-2">
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setVideoRecordingMode('upload');
                            }}
                          >
                            Upload
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                            onClick={() => {
                              setVideoRecordingMode('record');
                              getAvailableCameras();
                            }}
                          >
                            Record
                          </Button>
                        </div>
                      </div>
                      
                      {showCameraSelection ? (
                        <div className="p-4 border rounded-md">
                          <h4 className="text-sm font-medium mb-3">Select Camera</h4>
                          
                          {availableCameras.length > 0 ? (
                            <>
                              <div className="grid grid-cols-1 gap-2 mb-4">
                                {availableCameras.map((device) => (
                                  <div 
                                    key={device.deviceId} 
                                    className={`p-3 border rounded-md cursor-pointer flex items-center ${selectedVideoDevice === device.deviceId ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                                    onClick={() => {
                                      console.log("Setting selected video device:", device.deviceId);
                                      setSelectedVideoDevice(device.deviceId);
                                    }}
                                  >
                                    <div className="mr-3 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                      <Video className="w-4 h-4 text-gray-600" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{device.label || `Camera ${device.deviceId.slice(0, 5)}...`}</p>
                                    </div>
                                    {selectedVideoDevice === device.deviceId && (
                                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                              
                              {/* Always show the button, but disable it if no camera is selected */}
                              <div className="flex justify-center mb-4">
                                <Button 
                                  size="default"
                                  className={`${selectedVideoDevice ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'} text-white w-full py-2`}
                                  onClick={() => {
                                    if (selectedVideoDevice) {
                                      console.log("Starting recording with device:", selectedVideoDevice);
                                      setShowCameraSelection(false);
                                      startVideoRecording();
                                    }
                                  }}
                                  disabled={!selectedVideoDevice}
                                >
                                  {selectedVideoDevice 
                                    ? "Start Recording with Selected Camera" 
                                    : "Select a Camera First"}
                                </Button>
                              </div>
                              
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setShowCameraSelection(false)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-sm text-gray-500 mb-3">No cameras found</p>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setShowCameraSelection(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full py-6 border border-dashed rounded-md">
                          <Video className="w-8 h-8 text-gray-400 mb-3" />
                          <p className="text-sm text-gray-500 mb-3">Ready to record a video?</p>
                          <Button 
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={getAvailableCameras}
                          >
                            Show Available Cameras
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {isVideoRecording ? (
                        <div className="flex flex-col items-center">
                          <div className="relative w-full rounded-md overflow-hidden bg-black mb-2" style={{ height: '300px' }}>
                            <video 
                              ref={videoRef} 
                              autoPlay 
                              muted 
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                              <div className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-medium animate-pulse flex items-center">
                                <span className="w-2 h-2 bg-white rounded-full mr-2 animate-ping"></span>
                                Recording
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="destructive" 
                            onClick={stopVideoRecording}
                            className="px-4 py-2"
                          >
                            Stop Recording
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <video 
                            src={videoPreviewUrl || undefined} 
                            controls 
                            className="w-full rounded-md" 
                            style={{ maxHeight: '300px' }}
                          />
                          <div className="flex space-x-2 mt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setVideoBlob(null);
                                setVideoPreviewUrl(null);
                              }}
                              className="border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <X className="w-4 h-4 mr-2" /> Discard
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={submitComment}
                              disabled={submitting}
                            >
                              {submitting ? "Saving..." : "Use This Video"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
          
          {activeTab === 'file' && (
            <div className="w-full">
              <input
                type="file"
                id="fileUpload"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  // Validate file size (5MB limit)
                  if (file.size > 5 * 1024 * 1024) {
                    setError('File size must be less than 5MB');
                    return;
                  }
                  
                  setSelectedFile(file);
                  setError(null);
                }}
              />
              <label
                htmlFor="fileUpload"
                className="flex items-center justify-center w-full py-3 border border-dashed rounded-md cursor-pointer hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <FileIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm">Upload File</span>
                </div>
              </label>
              {selectedFile && (
                <div className="mt-2 flex items-center justify-between bg-gray-50 p-2 rounded-md">
                  <span className="text-sm truncate">{selectedFile.name}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="w-full bg-gray-200 h-1">
            <div 
              className="bg-blue-600 h-1 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}
        
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button 
                variant={activeTab === 'text' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab('text')}
                className="px-3"
              >
                Text
              </Button>
              <Button 
                variant={activeTab === 'audio' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab('audio')}
                className="px-3"
              >
                <Mic className="w-4 h-4 mr-1" />
                Audio
              </Button>
              <Button 
                variant={activeTab === 'video' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab('video')}
                className="px-3"
              >
                <Video className="w-4 h-4 mr-1" />
                Video
              </Button>
              <Button 
                variant={activeTab === 'file' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab('file')}
                className="px-3"
              >
                <FileIcon className="w-4 h-4 mr-1" />
                File
              </Button>
            </div>
            <Button 
              onClick={submitComment}
              disabled={submitting || (activeTab === 'text' && !newComment.trim() && !selectedFile)}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Send className="mr-2 h-4 w-4" />
              {submitting ? "Submitting..." : "Submit Answer"}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {parentComments.map((comment) => (
          <div key={comment.id} className="space-y-2">
            <div className="flex items-start gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {comment.user.first_name[0]}{comment.user.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {comment.user.first_name} {comment.user.last_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                {comment.content && <p className="text-sm">{comment.content}</p>}
                {comment.file_url && (
                  <div className="mt-2">
                    <MediaPreview type={comment.media_type} url={comment.file_url} />
                  </div>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`${comment.has_liked ? 'text-red-500' : 'text-gray-500'} hover:text-red-500`}
                    onClick={() => handleLike(comment.id)}
                  >
                    <Heart className={`w-4 h-4 ${comment.has_liked ? 'fill-current' : ''}`} />
                    <span className="ml-1">{comment.like_count}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => handleReply(comment.id)}
                  >
                    <Reply className="mr-1 h-3 w-3" />
                    Reply
                  </Button>
                </div>
              </div>
            </div>

            {replyingTo === comment.id && (
              <div className="ml-10 mt-2 flex items-start gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src="/placeholder.svg?height=40&width=40&text=Y" alt="You" />
                  <AvatarFallback>Y</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    placeholder={`Reply to ${comment.user.first_name}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="min-h-[60px]"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setReplyingTo(null)}>
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => submitReply(comment.id)} 
                      disabled={!replyText.trim() || submitting}
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {getCommentReplies(comment.id).length > 0 && (
              <div className="ml-10 space-y-2">
                {getCommentReplies(comment.id).map((reply) => (
                  <div key={reply.id} className="flex items-start gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>
                        {reply.user.first_name[0]}{reply.user.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {reply.user.first_name} {reply.user.last_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {reply.content && <p className="text-sm">{reply.content}</p>}
                      {reply.file_url && (
                        <div className="mt-2">
                          <MediaPreview type={reply.media_type} url={reply.file_url} />
                        </div>
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => handleLike(reply.id)}
                        >
                          <Heart className="mr-1 h-3 w-3" />
                          {reply.like_count > 0 && <span>{reply.like_count}</span>}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {parentComments.length === 0 && (
          <div className="py-4 text-center text-muted-foreground">
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>
    </div>
  );
}
