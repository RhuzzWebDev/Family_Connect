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
      <div className="pl-6 pr-6 md:pl-8" style={{ background: '#0F1017', color: '#fff' }}>
        <div className="mb-8 pt-8">
          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">All Questions</h1>
          <p className="text-lg text-gray-300 mb-4">
            Browse and interact with all family questions in one place. Ask, answer, and connect with your family members!
          </p>
          <div className="border-b border-gray-700 mb-4"></div>
        </div>
        <QuestionGrid showHeader={true} />
      </div>
    </Layout>
  );
}
