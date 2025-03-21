'use client';

import { useState, useEffect } from 'react';
import { QuestionCard } from '@/components/question/QuestionCard';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Home as HomeIcon, Users, Calendar, MessageSquare, PlusCircle, Search } from 'lucide-react';
import { default as CreateQuestionForm } from '@/components/dashboard/CreateQuestionForm';
import Link from 'next/link';
import { SupabaseService } from '@/services/supabaseService';
import { QuestionWithUser } from '@/lib/supabase';
import { Card } from '@/components/ui/card';

export default function HomePage() {
  const [questions, setQuestions] = useState<QuestionWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const data = await SupabaseService.getQuestions();
        setQuestions(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch questions:', err);
        setError('Failed to load questions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const handleQuestionCreated = async () => {
    try {
      setIsLoading(true);
      const data = await SupabaseService.getQuestions();
      setQuestions(data);
      setError(null);
    } catch (err) {
      console.error('Failed to refresh questions:', err);
      setError('Failed to refresh questions. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 hidden md:flex flex-col gap-2 p-4 border-r min-h-[calc(100vh-4rem)] sticky top-16">
          <Button variant="ghost" className="justify-start gap-2" size="lg" asChild>
            <Link href="/">
              <HomeIcon className="w-5 h-5" />
              Home
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start gap-2" size="lg" asChild>
            <Link href="/family">
              <Users className="w-5 h-5" />
              Family Members
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start gap-2" size="lg" asChild>
            <Link href="/events">
              <Calendar className="w-5 h-5" />
              Events
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start gap-2" size="lg" asChild>
            <Link href="/messages">
              <MessageSquare className="w-5 h-5" />
              Messages
            </Link>
          </Button>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Family Feed</h1>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <PlusCircle className="w-5 h-5" />
                    Ask Question
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ask a Question</DialogTitle>
                  </DialogHeader>
                  <CreateQuestionForm onQuestionCreated={handleQuestionCreated} />
                </DialogContent>
              </Dialog>
            </div>

            {/* Questions grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <div className="text-center text-red-500 p-4">{error}</div>
            ) : questions.length === 0 ? (
              <div className="text-center text-muted-foreground p-4">
                No questions yet. Be the first to ask!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {questions.map((question) => (
                  <QuestionCard key={question.id} question={question} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
