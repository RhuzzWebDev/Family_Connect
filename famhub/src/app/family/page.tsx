'use client';

import { Layout } from "@/components/layout/Layout";
import FamilyHub from "@/components/family/FamilyHub";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function FamilyPage() {
  return (
    <AuthGuard>
      <Layout>
        <div className="pl-6 pr-6 md:pl-8" style={{ background: '#0F1017', color: '#fff', minHeight: '100vh' }}>
          <div className="mb-6 pt-6">
            
          </div>
          <FamilyHub />
        </div>
      </Layout>
    </AuthGuard>
  );
}
