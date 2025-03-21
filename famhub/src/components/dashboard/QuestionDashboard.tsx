'use client';

import { useState, useEffect } from "react";
import { QuestionWithUser } from "@/lib/supabase";
import { SupabaseService } from "@/services/supabaseService";
import QuestionCard from "@/components/dashboard/QuestionCard";
import CreateQuestionForm from "@/components/dashboard/CreateQuestionForm";
import { useRouter } from 'next/navigation';

export default function QuestionDashboard() {
  const [questions, setQuestions] = useState<QuestionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const userEmail = sessionStorage.getItem('userEmail');

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const records = await SupabaseService.getQuestions();
        setQuestions(records);
      } catch (error) {
        console.error("Error fetching questions:", error);
        if ((error as Error).message.includes('not found') || 
            (error as Error).message.includes('not active')) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    const interval = setInterval(fetchQuestions, 30000); // Poll every 30 seconds
    fetchQuestions(); // Initial fetch

    return () => clearInterval(interval);
  }, [router]);

  if (!userEmail) {
    router.push('/login');
    return null;
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <CreateQuestionForm onQuestionCreated={() => {
        SupabaseService.getQuestions().then(setQuestions);
      }} />
      {questions.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
          No questions found. Be the first to ask a question!
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </div>
      )}
    </div>
  );
}
