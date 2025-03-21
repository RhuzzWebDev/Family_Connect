'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/hooks/useSession';
import { Layout } from '@/components/layout/Layout';
import QuestionGrid from '@/components/dashboard/QuestionGrid';

export default function Home() {
  const router = useRouter();
  const { isClient, userEmail } = useSession();

  useEffect(() => {
    if (isClient && !userEmail) {
      router.push('/login');
    }
  }, [isClient, userEmail, router]);

  if (!isClient || !userEmail) {
    return null;
  }

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
