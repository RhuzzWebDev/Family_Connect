'use client';

import { useEffect } from 'react';
import QuestionGrid from '@/components/dashboard/QuestionGrid';
import { Layout } from '@/components/layout/Layout';

export default function DashboardPage() {
  useEffect(() => {
    const userEmail = sessionStorage.getItem('userEmail');
    if (!userEmail) {
      window.location.href = '/login';
    }
  }, []);

  return (
    <Layout>
      <div className="pl-6 pr-6 md:pl-8">
        <div className="mb-6 pt-6">
          <h1 className="text-3xl font-bold">Family Feed</h1>
        </div>
        <QuestionGrid />
      </div>
    </Layout>
  );
}
