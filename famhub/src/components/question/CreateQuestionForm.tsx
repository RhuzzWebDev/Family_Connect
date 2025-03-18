'use client';

import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AirtableService } from "@/services/airtableService";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const airtableService = new AirtableService();

  const getMediaType = (file: File): 'image' | 'video' | 'audio' | undefined => {
    const fileType = file.type.split('/')[0];
    if (['image', 'video', 'audio'].includes(fileType)) {
      return fileType as 'image' | 'video' | 'audio';
    }
    return undefined;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const mediaType = getMediaType(selectedFile);
      if (!mediaType) {
        setError('Please upload an image, video, or audio file');
        return;
      }
      setFile(selectedFile);
      setError(null);
    } else {
      setFile(undefined);
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

      const mediaType = file ? getMediaType(file) : undefined;

      const questionData: Partial<QuestionFields> = {
        user_id: userEmail,
        questions: question,
        mediaType,
        like_count: 0,
        comment_count: 0,
        Timestamp: new Date().toISOString(),
      };

      await airtableService.createQuestion(questionData, file);

      // Clear form
      setQuestion('');
      setFile(undefined);
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

  const getFileIcon = () => {
    if (!file) return null;
    const mediaType = getMediaType(file);
    switch (mediaType) {
      case 'image':
        return <ImageIcon className="h-5 w-5" />;
      case 'video':
        return <VideoIcon className="h-5 w-5" />;
      case 'audio':
        return <AudioIcon className="h-5 w-5" />;
      default:
        return null;
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

        <div className="flex items-center gap-2">
          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*,audio/*"
            className="flex-1"
          />
          {file && (
            <div className="flex items-center gap-2 rounded-md bg-muted px-2 py-1">
              {getFileIcon()}
              <span className="text-sm">{file.name}</span>
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
