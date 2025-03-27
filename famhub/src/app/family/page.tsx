'use client';

import { Layout } from "@/components/layout/Layout";
import FamilyHub from "@/components/family/FamilyHub";

export default function FamilyPage() {
  return (
    <Layout>
      <div className="pl-6 pr-6 md:pl-8">
        <div className="mb-6 pt-6">
          <h1 className="text-3xl font-bold">Family Hub</h1>
        </div>
        <FamilyHub />
      </div>
    </Layout>
  );
}
