'use client';

import QuestionGrid from '@/components/dashboard/QuestionGrid';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/hooks/useSession';

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

  return <QuestionGrid />;
}
