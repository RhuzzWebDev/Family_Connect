'use client';

import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SupabaseService } from "@/services/supabaseService";
import { FileStorageService } from "@/services/fileStorageService";
import { Loader2 } from "lucide-react";
import { Question } from "@/lib/supabase";
import { supabase } from '@/lib/supabase';

interface CreateQuestionFormProps {
  onQuestionCreated?: () => void;
}

export function CreateQuestionForm({ onQuestionCreated }: CreateQuestionFormProps) {
  const [question, setQuestion] = useState('');
  const [file, setFile] = useState<File | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileStorageService = new FileStorageService();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const mediaType = fileStorageService.getMediaType(selectedFile.name);
      if (!mediaType) {
        setError('Please upload an image, video, or audio file');
        return;
      }
      setFile(selectedFile);
      // Create preview URL
      const url = URL.createObjectURL(selectedFile);
      setPreview(url);
      setError(null);
    } else {
      setFile(undefined);
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user?.email) {
        throw new Error('Please log in to create a question');
      }

      // Get user details
      const user = await SupabaseService.getUserByEmail(session.user.email);
      if (!user) {
        throw new Error('User not found');
      }

      let fileUrl = '';
      let mediaType = undefined;
      let folderPath = '';

      // Handle file upload if present
      if (file) {
        const userEmail = session.user.email;
        folderPath = await fileStorageService.getUserFolderPath(userEmail);
        fileUrl = await fileStorageService.uploadFile(file, folderPath);
        mediaType = fileStorageService.getMediaType(file.name);
      }

      const questionData: Omit<Question, 'id' | 'created_at' | 'like_count' | 'comment_count'> = {
        user_id: user.id,
        question,
        file_url: fileUrl || undefined,
        media_type: mediaType,
        folder_path: folderPath || undefined
      };

      await SupabaseService.createQuestion(questionData);

      // Clear form
      setQuestion('');
      setFile(undefined);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Notify parent component
      if (onQuestionCreated) {
        onQuestionCreated();
      }
    } catch (error) {
      setError((error as Error).message || 'Failed to create question');
      console.error('Failed to create question:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <div className="space-y-2">
          <Textarea
            placeholder="What would you like to ask your family?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            disabled={loading}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Input
            type="file"
            onChange={handleFileChange}
            accept="image/*,video/*,audio/*"
            disabled={loading}
            ref={fileInputRef}
          />
          {preview && (
            <Card className="p-2">
              {file && fileStorageService.getMediaType(file.name) === 'image' ? (
                <img src={preview} alt="Preview" className="max-h-48 object-contain mx-auto" />
              ) : file && fileStorageService.getMediaType(file.name) === 'video' ? (
                <video src={preview} controls className="max-h-48 w-full" />
              ) : file && fileStorageService.getMediaType(file.name) === 'audio' ? (
                <audio src={preview} controls className="w-full" />
              ) : null}
            </Card>
          )}
        </div>

        <Button type="submit" disabled={loading || !question.trim()} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Question'
          )}
        </Button>
      </form>
    </Card>
  );
}
