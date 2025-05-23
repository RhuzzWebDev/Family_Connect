import { Layout } from '@/components/layout/Layout';
import { InnerNavbar } from '@/components/layout/InnerNavbar';
import QuestionGrid from '@/components/dashboard/QuestionGrid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { redirect } from 'next/navigation';
import { getQuestions, getQuestionSets } from '@/lib/server/questions';

// This is a server component that handles authentication and pre-fetches data
export default async function QuestionsPage() {
  // Check if user is authenticated with NextAuth
  const session = await getServerSession(authOptions);
  
  // Redirect to login if not authenticated
  if (!session) {
    redirect('/login');
  }
  
  // Pre-fetch data for better performance
  const [questions, questionSets] = await Promise.all([
    getQuestions(),
    getQuestionSets()
  ]);
  return (
    <Layout>
      <div className="pl-6 pr-6 md:pl-8" style={{ background: '#0F1017', color: '#fff' }}>
        <div className="mb-8 pt-8">
          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">All Questions</h1>
          <p className="text-lg text-gray-300 mb-4">
            Browse and interact with all family questions in one place. Ask, answer, and connect with your family members!
          </p>
          <div className="border-b border-gray-700 mb-4"></div>
        </div>
        {/* Pass pre-fetched data to the QuestionGrid component */}
        <QuestionGrid 
          initialQuestions={questions} 
          initialQuestionSets={questionSets}
          showHeader={true} 
        />
      </div>
    </Layout>
  );
}
