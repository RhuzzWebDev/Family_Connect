import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from 'next/navigation';

interface CreateQuestionFormProps {
  onQuestionCreated: () => void;
}

export default function CreateQuestionForm({ onQuestionCreated }: CreateQuestionFormProps) {
  const [question, setQuestion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const userEmail = sessionStorage.getItem('userEmail');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const getMediaType = (fileType: string): 'image' | 'video' | 'audio' | undefined => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType.startsWith('audio/')) return 'audio';
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) {
      router.push('/login');
      return;
    }
    
    setLoading(true);
    try {
      // Get user info for folder structure
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
      let mediaType: 'image' | 'video' | 'audio' | undefined;
      let folderPath = '';

      if (file) {
        // Determine folder path based on user role
        folderPath = user.persona === 'Parent' 
          ? `${user.last_name}/${user.first_name}`
          : `other/${user.first_name}`;

        // Upload file
        const timestamp = new Date().getTime();
        const fileExt = file.name.split('.').pop();
        const fileName = `${timestamp}.${fileExt}`;
        const filePath = `${folderPath}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('family-connect')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('family-connect')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        mediaType = getMediaType(file.type);
      }

      // Create question
      const { error: questionError } = await supabase
        .from('questions')
        .insert({
          user_id: user.id,
          question,
          file_url: fileUrl || null,
          media_type: mediaType,
          folder_path: folderPath || null,
          like_count: 0,
          comment_count: 0
        });

      if (questionError) throw questionError;

      // Reset form
      setQuestion("");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onQuestionCreated();
    } catch (error) {
      console.error("Error creating question:", error);
      if ((error as Error).message.includes('not found') || 
          (error as Error).message.includes('not active')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!userEmail) {
    router.push('/login');
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 p-4 shadow-sm">
      <div>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
          rows={3}
          required
        />
      </div>
      
      <div className="flex items-center justify-between">
        <input
          type="file"
          onChange={handleFileChange}
          accept="image/*,video/*,audio/*"
          className="text-sm text-gray-500"
          ref={fileInputRef}
        />
        
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className={`rounded-lg px-4 py-2 text-white ${
            loading || !question.trim()
              ? "bg-gray-400"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "Posting..." : "Post Question"}
        </button>
      </div>
    </form>
  );
}
