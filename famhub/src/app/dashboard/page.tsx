'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QuestionDashboard from '@/components/question/QuestionDashboard';
import CreateMemoryForm from '@/components/memory/CreateMemoryForm';

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Check if user is logged in based on session storage
    const userSession = sessionStorage.getItem('user');
    if (!userSession) {
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Questions Section - Takes up 2 columns on large screens */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-semibold mb-4">Family Questions</h2>
          <QuestionDashboard />
        </div>

        {/* Memory Creation Section - Takes up 1 column on large screens */}
        <div className="lg:col-span-1">
          <h2 className="text-2xl font-semibold mb-4">Create Memory</h2>
          <CreateMemoryForm />
        </div>
      </div>
    </main>
  );
}
