'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CreateQuestionForm from './CreateQuestionForm';
import { format } from 'date-fns';
import { ThumbsUp, MessageSquare, Image as ImageIcon, Video, Music, Trash2, AlertTriangle, PlusCircle, X } from 'lucide-react';
import Image from 'next/image';

interface Question {
  id: string;
  question: string;
  created_at: string;
  file_url: string | null;
  media_type: string | null;
  like_count: number;
  comment_count: number;
  user: {
    first_name: string;
    last_name: string;
    role: string;
    persona: string;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  question_id: string;
  like_count: number;
  file_url: string | null;
  media_type: string | null;
  folder_path: string | null;
  parent_id: string | null;
  user: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

export default function QuestionGrid() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`*, user:users!questions_user_id_fkey (first_name, last_name, role, persona)`)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setQuestions(data || []);
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (questionId: string) => {
    setLoadingComments(true);
    setCommentError(null);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`*, user:users!comments_user_id_fkey (first_name, last_name, role)`)
        .eq('question_id', questionId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      setComments(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setCommentError('Failed to load comments. Please try again.');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleLike = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ like_count: questions.find(q => q.id === questionId)?.like_count! + 1 })
        .eq('id', questionId);

      if (error) {
        throw error;
      }

      setQuestions(questions.map(q =>
        q.id === questionId ? { ...q, like_count: q.like_count + 1 } : q
      ));
    } catch (err) {
      console.error('Error liking question:', err);
    }
  };

  const handleCommentLike = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .update({ like_count: comments.find(c => c.id === commentId)?.like_count! + 1 })
        .eq('id', commentId);

      if (error) {
        throw error;
      }

      setComments(comments.map(c =>
        c.id === commentId ? { ...c, like_count: c.like_count + 1 } : c
      ));
    } catch (err) {
      console.error('Error liking comment:', err);
    }
  };

  const handleCommentClick = (questionId: string) => {
    setSelectedQuestionId(questionId);
    fetchComments(questionId);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const MediaPreview = ({ type, url }: { type: string | null; url: string | null }) => {
    if (!url) return null;

    switch (type) {
      case 'image':
        return (
          <div className="relative aspect-video w-full overflow-hidden rounded-md">
            <Image
              src={url || ''}
              alt="Media preview"
              fill
              className="object-contain"
              unoptimized={true}
            />
          </div>
        );
      case 'video':
        return (
          <div className="relative aspect-video w-full overflow-hidden rounded-md">
            <video
              src={url || ''}
              controls
              className="h-full w-full"
            />
          </div>
        );
      case 'audio':
        return (
          <div className="relative w-full overflow-hidden rounded-md bg-gray-50 p-4">
            <audio
              src={url || ''}
              controls
              className="w-full"
            />
          </div>
        );
      default:
        return null;
    }
  };

  const MediaTypeIcon = ({ type }: { type: string | null }) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-gray-400" />;
      case 'video':
        return <Video className="w-5 h-5 text-gray-400" />;
      case 'audio':
        return <Music className="w-5 h-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB limit from memories)
    if (file.size > 5 * 1024 * 1024) {
      setCommentError('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const fileType = file.type.split('/')[0];
    if (!['image', 'video', 'audio'].includes(fileType)) {
      setCommentError('Only image, video, and audio files are allowed');
      return;
    }

    setSelectedFile(file);
    setCommentError(null);
  };

  const uploadFile = async (file: File, userId: string) => {
    const fileType = file.type.split('/')[0];
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const folderPath = `public/uploads/comments/${userId}`;
    const filePath = `${folderPath}/${fileName}`;

    try {
      // Create a custom upload handler with progress tracking
      const { error: uploadError } = await new Promise<{ error: Error | null }>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (event: ProgressEvent) => {
          if (event.lengthComputable) {
            setUploadProgress((event.loaded / event.total) * 100);
          }
        };

        xhr.onload = async () => {
          if (xhr.status === 200) {
            const { error } = await supabase.storage
              .from('comments')
              .upload(filePath, file);
            resolve({ error });
          } else {
            resolve({ error: new Error('Upload failed') });
          }
        };

        xhr.onerror = () => resolve({ error: new Error('Upload failed') });
        xhr.open('POST', `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/comments/${filePath}`);
        xhr.setRequestHeader('Authorization', `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`);
        xhr.send(file);
      });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('comments')
        .getPublicUrl(filePath);

      return {
        file_url: publicUrl,
        media_type: fileType,
        folder_path: folderPath,
      };
    } catch (err) {
      console.error('Error uploading file:', err);
      throw new Error('Failed to upload file');
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestionId || (!newComment.trim() && !selectedFile)) {
      setCommentError('Please add either a comment or media file');
      return;
    }

    setSubmittingComment(true);
    setCommentError(null);
    setUploadProgress(0);

    try {
      // Get current session
      const session = supabase.auth.getSession();
      if (!session) {
        throw new Error('Please log in to comment');
      }

      const userEmail = sessionStorage.getItem('userEmail');
      if (!userEmail) {
        throw new Error('Please log in to comment');
      }

      // Get user data with debugging
      console.log('Fetching user data for email:', userEmail);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', userEmail)
        .single();

      if (userError) {
        console.error('User fetch error:', userError);
        throw new Error('Failed to verify user. Please try logging in again.');
      }

      if (!userData?.id) {
        console.error('User not found for email:', userEmail);
        throw new Error('User not found. Please try logging in again.');
      }

      console.log('Found user:', { id: userData.id, email: userData.email });

      let fileData = null;
      if (selectedFile) {
        try {
          console.log('Uploading file:', selectedFile.name);
          fileData = await uploadFile(selectedFile, userData.id);
          console.log('File upload successful:', fileData);
        } catch (uploadError: any) {
          console.error('File upload error:', uploadError);
          throw new Error(uploadError?.message || 'Failed to upload file. Please try again.');
        }
      }

      // Prepare comment data
      const commentData = {
        ...(newComment.trim() && { content: newComment.trim() }),
        question_id: selectedQuestionId,
        user_id: userData.id,
        ...(fileData && {
          file_url: fileData.file_url,
          media_type: fileData.media_type,
          folder_path: fileData.folder_path,
        }),
      };

      console.log('Inserting comment:', commentData);

      const { data: insertedComment, error: insertError } = await supabase
        .from('comments')
        .insert([commentData])
        .select()
        .single();

      if (insertError) {
        console.error('Comment insert error details:', {
          error: insertError,
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        });
        throw new Error(insertError.message || 'Failed to post comment. Please try again.');
      }

      console.log('Comment inserted successfully:', insertedComment);

      // Update comment count
      const { error: updateError } = await supabase
        .from('questions')
        .update({ comment_count: questions.find(q => q.id === selectedQuestionId)?.comment_count! + 1 })
        .eq('id', selectedQuestionId);

      if (updateError) {
        console.error('Comment count update error:', updateError);
        // Don't throw here, as the comment was already created
      }

      setNewComment('');
      setSelectedFile(null);
      await fetchComments(selectedQuestionId);
      await fetchQuestions(); // Refresh questions to update comment count
    } catch (err: any) {
      console.error('Error submitting comment:', {
        error: err,
        message: err?.message,
        details: err?.details,
        code: err?.code
      });
      setCommentError(err?.message || 'Failed to post comment. Please try again.');
    } finally {
      setSubmittingComment(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteComment = async (commentId: string, questionId: string) => {
    setCommentError(null);
    try {
      const userEmail = sessionStorage.getItem('userEmail');
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (!userData) throw new Error('User not found');

      // Get comment data for file cleanup
      const comment = comments.find(c => c.id === commentId);
      
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', userData.id);

      if (error) throw error;

      // Clean up file if it exists
      if (comment?.file_url) {
        const filePath = comment.folder_path?.split('public/uploads/comments/')[1];
        if (filePath) {
          await supabase.storage
            .from('comments')
            .remove([filePath]);
        }
      }

      // Update comment count
      await supabase
        .from('questions')
        .update({ comment_count: questions.find(q => q.id === questionId)?.comment_count! - 1 })
        .eq('id', questionId);

      // Optimistically update UI
      setComments(comments.filter(c => c.id !== commentId));
      setQuestions(questions.map(q =>
        q.id === questionId ? { ...q, comment_count: q.comment_count - 1 } : q
      ));
    } catch (err) {
      console.error('Error deleting comment:', err);
      setCommentError('Failed to delete comment. Please try again.');
    }
  };

  useEffect(() => {
    fetchQuestions();

    // Subscribe to new questions and comment count updates
    const channel = supabase
      .channel('questions-channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'questions'
        }, 
        () => {
          fetchQuestions();
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments'
        },
        () => {
          // Refresh questions to update comment counts
          fetchQuestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (selectedQuestionId) {
      fetchComments(selectedQuestionId);

      // Subscribe to new comments, updates, and deletions
      const channel = supabase
        .channel(`comments-${selectedQuestionId}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'comments',
            filter: `question_id=eq.${selectedQuestionId}`
          }, 
          (payload) => {
            if (payload.eventType === 'UPDATE') {
              // Update the specific comment
              setComments(prevComments => prevComments.map(comment => 
                comment.id === payload.new.id 
                  ? { ...comment, ...payload.new }
                  : comment
              ));
            } else {
              // For INSERT or DELETE, fetch all comments to ensure we have the latest state
              // including any file uploads or deletions
              fetchComments(selectedQuestionId);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedQuestionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-10 h-10 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin"></div>
        <p className="text-gray-500">Loading questions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-red-50 rounded-lg">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <p className="text-red-600 font-medium">{error}</p>
        <Button 
          onClick={fetchQuestions}
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Recent Questions</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              Ask Question
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white sm:max-w-[600px] p-0">
            <DialogHeader className="pt-8 px-6 pb-4 border-b">
              <DialogTitle className="text-lg font-semibold text-center">Ask a Question</DialogTitle>
            </DialogHeader>
            <div className="p-6">
              <CreateQuestionForm onQuestionCreated={fetchQuestions} type="question" />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <MessageSquare className="w-16 h-16 text-gray-300" />
          <p className="text-gray-500 text-center">No questions yet. Be the first to ask!</p>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white mt-2">
                Ask a Question
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white sm:max-w-[600px] p-0">
              <DialogHeader className="pt-8 px-6 pb-4 border-b">
                <DialogTitle className="text-lg font-semibold text-center">Ask a Question</DialogTitle>
              </DialogHeader>
              <div className="p-6">
                <CreateQuestionForm onQuestionCreated={fetchQuestions} type="question" />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {questions.map((question) => (
            <div 
              key={question.id} 
              className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-5 space-y-4 transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold shrink-0">
                  {getInitials(question.user.first_name, question.user.last_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <h3 className="font-semibold text-gray-900 line-clamp-1">
                        {question.user.first_name} {question.user.last_name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {question.user.role}
                        </span>
                        <time className="text-xs text-gray-500">
                          {format(new Date(question.created_at), 'MMM d, yyyy')}
                        </time>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-gray-700 line-clamp-3">{question.question}</p>
                  {question.file_url && (
                    <div className="mt-3 border rounded-md overflow-hidden">
                      <MediaPreview type={question.media_type} url={question.file_url} />
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full h-8 px-3"
                        onClick={() => handleLike(question.id)}
                      >
                        <ThumbsUp className="w-4 h-4 mr-1.5" />
                        <span>{question.like_count}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full h-8 px-3"
                        onClick={() => handleCommentClick(question.id)}
                      >
                        <MessageSquare className="w-4 h-4 mr-1.5" />
                        <span>{question.comment_count}</span>
                      </Button>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          Answer
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white sm:max-w-[600px] p-0">
                        <DialogHeader className="pt-8 px-6 pb-4 border-b">
                          <DialogTitle className="text-lg font-semibold text-center">Post an Answer</DialogTitle>
                        </DialogHeader>
                        <div className="p-6">
                          <CreateQuestionForm onQuestionCreated={fetchQuestions} type="answer" />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comments Dialog */}
      <Dialog open={!!selectedQuestionId} onOpenChange={(open) => {
        if (!open) {
          setSelectedQuestionId(null);
          setNewComment('');
        }
      }}>
        <DialogContent className="bg-white sm:max-w-[600px] p-0">
          <DialogHeader className="pt-8 px-6 pb-4 border-b">
            <DialogTitle className="text-lg font-semibold text-center">Comments</DialogTitle>
          </DialogHeader>
          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
            {loadingComments ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-2">
                <div className="w-6 h-6 border-2 border-t-blue-600 border-blue-200 rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500">Loading comments...</p>
              </div>
            ) : commentError ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-3">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-red-600">{commentError}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-blue-600"
                  onClick={() => {
                    setCommentError(null);
                    if (selectedQuestionId) fetchComments(selectedQuestionId);
                  }}
                >
                  Try Again
                </Button>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">No comments yet. Start the conversation!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-4 hover:bg-gray-50 p-3 rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {getInitials(comment.user.first_name, comment.user.last_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm">
                        {comment.user.first_name} {comment.user.last_name}
                      </h4>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                        {comment.user.role}
                      </span>
                      <time className="text-xs text-gray-500 ml-auto">
                        {format(new Date(comment.created_at), 'MMM d, yyyy')}
                      </time>
                      {comment.user_id === comments.find(c => c.id === comment.id)?.user_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-red-600 h-auto py-1 px-1 ml-2"
                          onClick={() => handleDeleteComment(comment.id, selectedQuestionId!)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-700 break-words">{comment.content}</p>
                    {comment.file_url && (
                      <div className="mt-2">
                        <MediaPreview type={comment.media_type} url={comment.file_url} />
                      </div>
                    )}
                    <div className="mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-blue-600 h-auto py-1"
                        onClick={() => handleCommentLike(comment.id)}
                      >
                        <ThumbsUp className="w-3 h-3 mr-1" />
                        <span className="text-xs">{comment.like_count}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t bg-gray-50">
            <form onSubmit={handleSubmitComment} className="space-y-4">
              {commentError && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
                  {commentError}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment or add media..."
                  className="flex-1 min-w-0 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                  disabled={submittingComment}
                />
                <Button 
                  type="submit" 
                  disabled={(!newComment.trim() && !selectedFile) || submittingComment}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 disabled:bg-blue-400"
                  size="sm"
                >
                  {submittingComment ? 'Posting...' : 'Post'}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="commentFile"
                  className="hidden"
                  accept="image/*,video/*,audio/*"
                  onChange={handleFileSelect}
                  disabled={submittingComment}
                />
                <label
                  htmlFor="commentFile"
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 cursor-pointer disabled:opacity-50"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={submittingComment}
                  >
                    {selectedFile?.type.startsWith('image/') ? (
                      <ImageIcon className="w-4 h-4" />
                    ) : selectedFile?.type.startsWith('video/') ? (
                      <Video className="w-4 h-4" />
                    ) : selectedFile?.type.startsWith('audio/') ? (
                      <Music className="w-4 h-4" />
                    ) : (
                      <PlusCircle className="w-4 h-4" />
                    )}
                    Add Media
                  </Button>
                </label>
                {selectedFile && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {selectedFile.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      disabled={submittingComment}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
