'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';
import QuestionDashboard from '@/components/dashboard/QuestionDashboard';

export default function DashboardPage() {
  useEffect(() => {
    const userEmail = sessionStorage.getItem('userEmail');
    if (!userEmail) {
      window.location.href = '/login';
    }
  }, []);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Family Connect Dashboard</h1>
      <QuestionDashboard />
    </main>
  );
}
