'use client';

import { useState, useEffect } from 'react';

export function useSession() {
  const [isClient, setIsClient] = useState(false);
  const [sessionData, setSessionData] = useState<{ userEmail: string | null }>({
    userEmail: null,
  });

  useEffect(() => {
    setIsClient(true);
    const userEmail = window?.sessionStorage?.getItem('userEmail');
    setSessionData({ userEmail });
  }, []);

  const setUserEmail = (email: string | null) => {
    if (email) {
      window?.sessionStorage?.setItem('userEmail', email);
    } else {
      window?.sessionStorage?.removeItem('userEmail');
    }
    setSessionData({ userEmail: email });
  };

  return {
    isClient,
    userEmail: sessionData.userEmail,
    setUserEmail,
  };
}
