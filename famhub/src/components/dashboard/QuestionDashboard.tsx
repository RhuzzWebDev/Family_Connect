'use client';

import { useState, useEffect } from "react";
import { AirtableService } from "@/services/airtableService";
import { QuestionCard } from "@/components/ui/QuestionCard";
import { CreateQuestionForm } from "@/components/question/CreateQuestionForm";
import { Loader2 } from "lucide-react";

export function QuestionDashboard() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const airtableService = new AirtableService();

  const fetchQuestions = async () => {
    try {
      const records = await airtableService.getQuestions();
      setQuestions(records);
      setError(null);
    } catch (err) {
      setError("Failed to load questions");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    // Set up polling for real-time updates
    const interval = setInterval(fetchQuestions, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CreateQuestionForm onQuestionCreated={fetchQuestions} />
      
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-500">
          {error}
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
          No questions found. Be the first to ask a question!
        </div>
      ) : (
        questions.map((record) => (
          <QuestionCard
            key={record.id}
            questionId={record.id}
            onUpdate={fetchQuestions}
          />
        ))
      )}
    </div>
  );
}
