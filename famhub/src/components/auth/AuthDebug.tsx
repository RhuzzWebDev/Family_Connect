'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

export function AuthDebug() {
  const { data: session, status } = useSession();
  const [isClient, setIsClient] = useState(false);
  const [cookies, setCookies] = useState<string>('');

  useEffect(() => {
    setIsClient(true);
    setCookies(document.cookie);
    
    // Log authentication information to console
    console.log('=== AUTH DEBUG INFO ===');
    console.log('Auth Status:', status);
    console.log('Session:', session);
    console.log('Cookies:', document.cookie);
    console.log('Current URL:', window.location.href);
    console.log('=====================');
  }, [session, status]);

  if (!isClient) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-md text-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Auth Debug</h3>
        <button 
          onClick={() => document.getElementById('auth-debug-content')?.classList.toggle('hidden')}
          className="text-gray-400 hover:text-white"
        >
          Toggle
        </button>
      </div>
      
      <div id="auth-debug-content">
        <div className="mb-2">
          <span className="font-semibold">Status:</span> 
          <span className={
            status === 'authenticated' ? 'text-green-400' : 
            status === 'loading' ? 'text-yellow-400' : 'text-red-400'
          }>
            {status}
          </span>
        </div>
        
        {session && (
          <div className="mb-2 overflow-hidden">
            <span className="font-semibold">User:</span> {session.user?.email}
          </div>
        )}
        
        <div className="mb-2">
          <span className="font-semibold">URL:</span> {window.location.href}
        </div>
        
        <div className="mb-2">
          <span className="font-semibold">Cookies:</span> 
          <div className="text-gray-300 truncate">{cookies}</div>
        </div>
      </div>
    </div>
  );
}
