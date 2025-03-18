'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QuestionDashboard } from '@/components/dashboard/QuestionDashboard';

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Check if user is logged in based on session storage
    const userEmail = sessionStorage.getItem('userEmail');
    if (!userEmail) {
      router.push('/login');
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  if (!isAuthorized) {
    return null; // Don't render anything while checking authorization
  }

  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="mb-8 text-3xl font-bold">Family Connect Dashboard</h1>
      <QuestionDashboard />
    </main>
  );
}
