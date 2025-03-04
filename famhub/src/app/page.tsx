'use client';

import { QuestionCard } from '@/components/ui/QuestionCard';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Home as HomeIcon, Users, Calendar, MessageSquare, PlusCircle, Search } from 'lucide-react';
import { NewQuestionForm } from '@/components/new-question-form';
import Link from 'next/link';

// Mock data for demonstration
const questions = Array(6).fill(null).map((_, i) => ({
  id: i,
  text: `What's your favorite family memory from ${2024 - i}?`,
  mediaUrl: i % 3 === 0 ? '/sample-image.jpg' : i % 3 === 1 ? '/sample-video.mp4' : '/sample-audio.mp3',
  mediaType: (i % 3 === 0 ? 'image' : i % 3 === 1 ? 'video' : 'audio') as 'image' | 'video' | 'audio',
  likes: 3 + i,
  comments: 2 + i,
  author: {
    name: `Family Member ${i % 5 + 1}`,
    avatar: `/avatars/member${i % 5 + 1}.jpg`,
  },
  createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(), // Days ago
}));

export default function HomePage() {
  const handleNewQuestion = (question: any) => {
    console.log('New question:', question);
    // In a real app, you would send this to your backend
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
        <main className="flex-1 container py-6 px-4">
          {/* Search and Create section */}
          <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search memories..."
                className="w-full pl-9 pr-4 py-2 rounded-full border bg-background"
              />
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto gap-2">
                  <PlusCircle className="w-5 h-5" />
                  Create Memory
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a New Memory</DialogTitle>
                </DialogHeader>
                <NewQuestionForm onSubmit={handleNewQuestion} />
              </DialogContent>
            </Dialog>
          </div>

          {/* Memory cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {questions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
              />
            ))}
          </div>

          {/* Load more button */}
          <div className="mt-8 text-center">
            <Button variant="outline" size="lg">
              Load More Memories
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}
