'use client';

import QuestionGrid from '@/components/dashboard/QuestionGrid';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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

  return <QuestionGrid />;
}
