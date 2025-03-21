'use client';

import { useState, useRef } from "react";
import { supabase } from '@/lib/supabase';
import { Camera, ImageIcon, Mic, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface CreateQuestionFormProps {
  onQuestionCreated: () => void;
  type?: 'question' | 'answer';
}

const SUPPORTED_FILE_TYPES = {
  image: ['.jpg', '.jpeg', '.png', '.gif'],
  video: ['.mp4', '.webm', '.mov'],
  audio: ['.mp3', '.wav', '.ogg']
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function CreateQuestionForm({ onQuestionCreated, type = 'question' }: CreateQuestionFormProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<"audio" | "video" | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "audio" | "video" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleStartRecording = (type: "audio" | "video") => {
    setIsRecording(true);
    setRecordingType(type);
    // In a real app, you would start recording here
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    // In a real app, you would stop recording and get the media file
    if (recordingType === "audio") {
      // Handle audio recording
      setMediaType("audio");
    } else if (recordingType === "video") {
      // Handle video recording
      setMediaType("video");
    }
    setRecordingType(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File size must be less than 5MB');
      return;
    }

    // Check file type
    const fileExtension = selectedFile.name.toLowerCase().match(/\.[^.]*$/)?.[0];
    const isValidType = fileExtension && Object.values(SUPPORTED_FILE_TYPES)
      .flat()
      .includes(fileExtension);

    if (!isValidType) {
      setError(`Unsupported file type. Allowed types:\nImages: ${SUPPORTED_FILE_TYPES.image.join(', ')}\nVideos: ${SUPPORTED_FILE_TYPES.video.join(', ')}\nAudio: ${SUPPORTED_FILE_TYPES.audio.join(', ')}`);
      return;
    }

    // Set file and preview
    setFile(selectedFile);
    setMediaType(selectedFile.type.startsWith("image/") ? "image" : 
                 selectedFile.type.startsWith("audio/") ? "audio" : 
                 selectedFile.type.startsWith("video/") ? "video" : null);
    const previewUrl = URL.createObjectURL(selectedFile);
    setMediaPreview(previewUrl);
    setError(null);
  };

  const handleClearMedia = () => {
    setMediaPreview(null);
    setMediaType(null);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const userEmail = sessionStorage.getItem('userEmail');
      if (!userEmail) {
        throw new Error('Please log in first');
      }

      // Get user details
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, role, persona')
        .eq('email', userEmail)
        .single();

      if (userError || !userData) {
        throw new Error('Could not find user details');
      }

      let fileUrl = '';
      let folderPath = '';
      let finalMediaType = null;

      if (file) {
        // Create folder path based on user persona
        if (userData.persona === 'Parent') {
          folderPath = `uploads/${userData.last_name}/${userData.role}`;
        } else {
          folderPath = `uploads/other/${userData.first_name}`;
        }

        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const filePath = `${folderPath}/${fileName}`;

        try {
          // Create FormData to send the file
          const formData = new FormData();
          formData.append('file', file);
          formData.append('path', filePath);

          // Send file to API route for local storage
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to upload file');
          }

          const { url } = await response.json();
          fileUrl = url;
          finalMediaType = mediaType;
        } catch (error) {
          console.error('Upload error:', error);
          throw new Error('Error uploading file');
        }
      }

      // Create question in Supabase
      const { error: insertError } = await supabase
        .from('questions')
        .insert({
          user_id: userData.id,
          question: text,
          file_url: fileUrl || null,
          folder_path: folderPath || null,
          media_type: finalMediaType,
          like_count: 0,
          comment_count: 0,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('Error creating question');
      }

      setText('');
      handleClearMedia();
      onQuestionCreated();
    } catch (err) {
      console.error('Error submitting:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMediaPreview = () => {
    if (!mediaPreview) return null;

    return (
      <div className="relative mt-2 rounded-md border">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-10 h-6 w-6 rounded-full bg-background/80"
          onClick={handleClearMedia}
        >
          <X className="h-4 w-4" />
        </Button>
        {mediaType === "image" && (
          <div className="relative h-[200px] w-full overflow-hidden rounded-md">
            <Image src={mediaPreview} alt="Preview" fill className="object-cover" />
          </div>
        )}
        {mediaType === "audio" && (
          <div className="flex items-center justify-center p-4">
            <audio src={mediaPreview} controls className="w-full" />
          </div>
        )}
        {mediaType === "video" && (
          <div className="relative h-[200px] w-full overflow-hidden rounded-md">
            <video src={mediaPreview} controls className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder={type === 'question' ? "What would you like to ask?" : "Share your answer..."}
        value={text}
        onChange={handleTextChange}
        className="min-h-[100px] w-full resize-none bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
      />

      <Tabs defaultValue="image" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="image">Image</TabsTrigger>
          <TabsTrigger value="audio">Audio</TabsTrigger>
          <TabsTrigger value="video">Video</TabsTrigger>
        </TabsList>
        <TabsContent value="image" className="space-y-4">
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8">
            <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground">Drag and drop an image or click to browse</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept={SUPPORTED_FILE_TYPES.image.join(',')} 
              onChange={handleFileUpload} 
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              Choose Image
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="audio" className="space-y-4">
          {isRecording && recordingType === "audio" ? (
            <div className="flex flex-col items-center space-y-4 rounded-md border p-4">
              <div className="h-4 w-full animate-pulse rounded-full bg-red-500"></div>
              <p className="text-sm">Recording audio...</p>
              <Button onClick={handleStopRecording}>Stop Recording</Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8">
              <Mic className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">Upload audio or record</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept={SUPPORTED_FILE_TYPES.audio.join(',')} 
                onChange={handleFileUpload} 
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Upload Audio
                </Button>
                <Button type="button" variant="outline" onClick={() => handleStartRecording("audio")}>
                  Record Audio
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="video" className="space-y-4">
          {isRecording && recordingType === "video" ? (
            <div className="flex flex-col items-center space-y-4 rounded-md border p-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                <div className="absolute right-2 top-2 h-3 w-3 animate-pulse rounded-full bg-red-500"></div>
              </div>
              <Button onClick={handleStopRecording}>Stop Recording</Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8">
              <Camera className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">Upload video or record</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept={SUPPORTED_FILE_TYPES.video.join(',')} 
                onChange={handleFileUpload} 
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Upload Video
                </Button>
                <Button type="button" variant="outline" onClick={() => handleStartRecording("video")}>
                  Record Video
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {renderMediaPreview()}

      {error && (
        <Alert variant="destructive" className="mt-4 bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end pt-4">
        <Button 
          type="submit" 
          disabled={!text.trim() || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSubmitting ? 'Posting...' : 'Post Question'}
        </Button>
      </div>
    </form>
  );
}
