'use client';

import { useEffect } from 'react';
import QuestionGrid from '@/components/dashboard/QuestionGrid';
import { Layout } from '@/components/layout/Layout';
import { InnerNavbar } from '@/components/layout/InnerNavbar';

export default function QuestionsPage() {
  useEffect(() => {
    const userEmail = sessionStorage.getItem('userEmail');
    if (!userEmail) {
      window.location.href = '/login';
    }
  }, []);

  return (
    <Layout>
      <InnerNavbar />
      <div className="pl-6 pr-6 md:pl-8">
        <div className="mb-6 pt-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">All Questions</h1>
          <p className="text-gray-600">
            Browse and interact with all family questions
          </p>
        </div>
        <QuestionGrid showHeader={true} />
      </div>
    </Layout>
  );
}
