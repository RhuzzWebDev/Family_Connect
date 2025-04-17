"use client";
import { Suspense } from 'react';
import InviteRegisterForm from '@/components/auth/InviteRegisterForm';

function InviteRegisterContent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <InviteRegisterForm />
    </div>
  );
}

export default function InviteRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>}>
      <InviteRegisterContent />
    </Suspense>
  );
}
