import { QuestionWithUser } from "@/lib/supabase";
import { SupabaseService } from "@/services/supabaseService";
import { useState } from "react";
import { useRouter } from 'next/navigation';

interface QuestionCardProps {
  question: QuestionWithUser;
}

export default function QuestionCard({ question }: QuestionCardProps) {
  const [likes, setLikes] = useState(question.like_count);
  const [comments, setComments] = useState(question.comment_count);
  const router = useRouter();

  const handleLike = async () => {
    try {
      const updatedQuestion = await SupabaseService.updateQuestionLikes(question.id, true);
      setLikes(updatedQuestion.like_count);
    } catch (error) {
      console.error("Error updating likes:", error);
      if ((error as Error).message.includes('not found') || 
          (error as Error).message.includes('not active')) {
        router.push('/login');
      }
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
            {question.user.first_name.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {question.user.first_name} {question.user.last_name}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-gray-800">{question.question}</p>
      </div>
      
      {question.file_url && (
        <div className="mb-4">
          {question.media_type === 'image' && (
            <img 
              src={question.file_url} 
              alt="Question attachment" 
              className="max-h-96 w-auto rounded-lg"
            />
          )}
          {question.media_type === 'video' && (
            <video 
              src={question.file_url} 
              controls 
              className="max-h-96 w-auto rounded-lg"
            />
          )}
          {question.media_type === 'audio' && (
            <audio 
              src={question.file_url} 
              controls 
              className="w-full"
            />
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-500">
        <button
          onClick={handleLike}
          className="flex items-center space-x-1 hover:text-blue-500"
        >
          <span>❤️ {likes}</span>
        </button>
        <div className="flex items-center space-x-1">
          <span>💬 {comments}</span>
        </div>
      </div>
    </div>
  );
}
