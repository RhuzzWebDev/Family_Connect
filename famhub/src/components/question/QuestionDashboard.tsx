'use client';
import { useState, useEffect } from 'react';
import { QuestionFields } from '@/services/airtableService';

interface QuestionWithId extends QuestionFields {
  id: string;
}

export default function QuestionDashboard() {
  const [questions, setQuestions] = useState<QuestionWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch('/api/questions');
        if (!response.ok) {
          throw new Error('Failed to fetch questions');
        }
        const data = await response.json();
        setQuestions(data.records);
        setError(null);
      } catch (err) {
        setError('Error loading questions. Please try again later.');
        console.error('Error fetching questions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchQuestions, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return <div className="text-center p-4">Loading questions...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Family Questions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {questions.map((question) => (
          <div key={question.id} className="bg-white rounded-lg shadow-md p-4">
            <p className="text-lg mb-2">{question.question}</p>
            {question.file_url && (
              <div className="mb-2">
                {question.file_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                  <img 
                    src={question.file_url} 
                    alt="Question media" 
                    className="w-full h-48 object-cover rounded"
                  />
                ) : question.file_url.match(/\.(mp4|webm)$/i) ? (
                  <video 
                    src={question.file_url} 
                    controls 
                    className="w-full rounded"
                  />
                ) : question.file_url.match(/\.(mp3|wav)$/i) ? (
                  <audio 
                    src={question.file_url} 
                    controls 
                    className="w-full"
                  />
                ) : null}
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>Likes: {question.like_count}</span>
              <span>Comments: {question.comment_count}</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Posted: {formatTimestamp(question.Timestamp)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
