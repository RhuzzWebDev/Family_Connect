'use client';

import { useEffect } from 'react';
import QuestionGrid from '@/components/dashboard/QuestionGrid';
import { Layout } from '@/components/layout/Layout';
import { InnerNavbar } from '@/components/layout/InnerNavbar';

export default function DashboardPage() {
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
         
        </div>
        <QuestionGrid />
      </div>
    </Layout>
  );
}
