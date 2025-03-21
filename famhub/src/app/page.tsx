'use client';

import QuestionGrid from '@/components/dashboard/QuestionGrid';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Header from '@/components/layout/Header';

export default function Home() {
  const router = useRouter();
  const userEmail = sessionStorage.getItem('userEmail');

  useEffect(() => {
    if (!userEmail) {
      router.push('/login');
    }
  }, [userEmail, router]);

  if (!userEmail) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-6">
        <QuestionGrid />
      </main>
    </div>
  );
}
