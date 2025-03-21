import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from 'next/navigation';
import { Camera, ImageIcon, Mic, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { FileStorageService } from "@/services/fileStorageService";

interface CreateQuestionFormProps {
  onQuestionCreated: () => void;
}

export default function CreateQuestionForm({ onQuestionCreated }: CreateQuestionFormProps) {
  const [question, setQuestion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<"audio" | "video" | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "audio" | "video" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const userEmail = sessionStorage.getItem('userEmail');
  const fileStorageService = new FileStorageService();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setMediaType(fileStorageService.getMediaType(selectedFile.name) || null);
    setMediaPreview(URL.createObjectURL(selectedFile));
  };

  const handleStartRecording = (type: "audio" | "video") => {
    setIsRecording(true);
    setRecordingType(type);
    // In a real app, you would start recording here using the MediaRecorder API
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setRecordingType(null);
  };

  const handleClearMedia = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaPreview(null);
    setMediaType(null);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
            <div className="h-[50px] w-full bg-muted"></div>
          </div>
        )}
        {mediaType === "video" && (
          <div className="relative h-[200px] w-full overflow-hidden rounded-md bg-muted">
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) {
      router.push('/login');
      return;
    }
    
    setLoading(true);
    try {
      // Get user info from users table
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (userError || !user) throw new Error('User not found');
      if (user.status !== 'Active') {
        router.push('/login');
        return;
      }

      let fileUrl = '';
      let uploadedMediaType: 'image' | 'video' | 'audio' | undefined;
      let folderPath = '';

      if (file) {
        try {
          folderPath = await fileStorageService.getUserFolderPath(userEmail);
          fileUrl = await fileStorageService.uploadFile(file, folderPath);
          uploadedMediaType = fileStorageService.getMediaType(file.name);
        } catch (uploadError) {
          console.error('Failed to upload file:', uploadError);
          throw new Error('Failed to upload file');
        }
      }

      // Create question using the user's ID from the users table
      const { error: questionError } = await supabase
        .from('questions')
        .insert({
          user_id: user.id,  // Use the ID from our users table
          question,
          file_url: fileUrl || null,
          media_type: uploadedMediaType || null,
          folder_path: folderPath || null,
          like_count: 0,
          comment_count: 0
        })
        .select();

      if (questionError) throw questionError;

      setQuestion("");
      handleClearMedia();
      onQuestionCreated();
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="Ask your family a question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="min-h-[100px]"
      />

      <Tabs defaultValue="image">
        <TabsList className="grid w-full grid-cols-3">
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
              accept="image/*" 
              onChange={handleFileChange}
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
            <Button type="button" variant="outline" className="w-full" onClick={() => handleStartRecording("audio")}>
              <Mic className="mr-2 h-4 w-4" />
              Record Audio
            </Button>
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
            <Button type="button" variant="outline" className="w-full" onClick={() => handleStartRecording("video")}>
              <Camera className="mr-2 h-4 w-4" />
              Record Video
            </Button>
          )}
        </TabsContent>
      </Tabs>

      {renderMediaPreview()}

      <div className="flex justify-end">
        <Button type="submit" disabled={loading || !question.trim()}>
          {loading ? "Posting..." : "Post Question"}
        </Button>
      </div>
    </form>
  );
}
