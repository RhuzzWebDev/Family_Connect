'use client';

import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AirtableService } from "@/services/airtableService";
import { FileStorageService } from "@/services/fileStorageService";
import { Loader2, Image as ImageIcon, Video as VideoIcon, Music as AudioIcon } from "lucide-react";
import { QuestionFields } from "@/services/airtableService";

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

  const airtableService = new AirtableService();
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
      const userEmail = sessionStorage.getItem('userEmail');
      if (!userEmail) {
        throw new Error('Please log in to create a question');
      }

      let fileUrl = '';
      let mediaType = undefined;
      let folderPath = '';

      // Handle file upload if present
      if (file) {
        folderPath = await fileStorageService.getUserFolderPath(userEmail);
        fileUrl = await fileStorageService.uploadFile(file, folderPath);
        mediaType = fileStorageService.getMediaType(file.name);
      }

      const questionData: Partial<QuestionFields> = {
        user_id: userEmail,
        question, 
        file_url: fileUrl,
        mediaType,
        folder_path: folderPath,
        like_count: 0,
        comment_count: 0,
        Timestamp: new Date().toISOString(),
      };

      await airtableService.createQuestion(questionData);

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
    } catch (err: any) {
      setError(err.message || 'Failed to create question');
      console.error('Failed to create question:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Textarea
            placeholder="What's on your mind?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[100px]"
            required
          />
        </div>

        <div className="space-y-2">
          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*,audio/*"
            className="flex-1"
          />
          {preview && file && (
            <div className="mt-2">
              {file.type.startsWith('image/') ? (
                <img src={preview} alt="Preview" className="max-h-48 rounded object-cover" />
              ) : file.type.startsWith('video/') ? (
                <video src={preview} controls className="max-h-48 w-full rounded" />
              ) : file.type.startsWith('audio/') ? (
                <audio src={preview} controls className="w-full" />
              ) : null}
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-500">{error}</div>
        )}

        <Button type="submit" disabled={loading || !question.trim()}>
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
