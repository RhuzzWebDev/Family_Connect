"use client"

import { MessagingInterface } from "@/components/messaging-interface"
import { Layout } from "@/components/layout/Layout"

export default function MessagesPage() {
  return (
    <Layout>
      <div className="container py-6 px-4">
        <MessagingInterface />
      </div>
    </Layout>
  )
}
