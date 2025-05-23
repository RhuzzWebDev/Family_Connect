'use client';

import { useEffect, useState } from 'react';
import QuestionGrid from '@/components/dashboard/QuestionGrid';
import { Layout } from '@/components/layout/Layout';
import { InnerNavbar } from '@/components/layout/InnerNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, ChevronRight, Users } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CreateFamilyModal } from '@/components/create-family-modal';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [userName, setUserName] = useState('');
  const [limitCards, setLimitCards] = useState(6);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [userHasFamily, setUserHasFamily] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      // This will redirect to the login page
      window.location.href = '/login';
    }
  });
  const router = useRouter();

  useEffect(() => {
    // If session is still loading, don't do anything yet
    if (status === 'loading') {
      setIsLoading(true);
      return;
    }
    
    // Check if user is authenticated
    if (status !== 'authenticated') {
      window.location.href = '/login';
      return;
    }
    
    // User is authenticated, set loading to false
    setIsLoading(false);
    
    const userEmail = session?.user?.email;

    // Fetch user name and family status
    const fetchUserProfile = async () => {
      if (!userEmail) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('first_name, family_id, id')
        .eq('email', userEmail)
        .single();

      if (!error && data) {
        setUserName(data.first_name);
        if (!data.family_id) {
          setUserHasFamily(false);
          setShowFamilyModal(true);
        }
      }
    };

    if (userEmail) {
      fetchUserProfile();
    }
  }, [session]);

  // Show loading state while session is loading
  if (isLoading || status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen bg-gray-900">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white mb-4">Loading dashboard...</h2>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        </div>
      </Layout>
    );
  }

  // Show dashboard once authenticated and loaded
  return (
    <Layout>
      {/* Show family creation modal if user has no family */}
      {!userHasFamily && (
        <CreateFamilyModal
          onFamilyCreated={async () => {
            // Refetch user profile to ensure family_id is set
            const userEmail = session?.user?.email;
            if (userEmail) {
              const { data, error } = await supabase
                .from('users')
                .select('family_id')
                .eq('email', userEmail)
                .single();
              if (!error && data && data.family_id) {
                setShowFamilyModal(false);
                setUserHasFamily(true);
              } else {
                setShowFamilyModal(true);
                setUserHasFamily(false);
              }
            }
          }}
          trigger={null}
          forceOpen={true}
        />
      )}
      <div className="pl-6 pr-6 md:pl-8" style={{ background: '#0F1017', color: '#fff', minHeight: '100vh' }}>
        {/* Welcome Section */}
        <div className="mb-8 pt-6">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#fff' }}>
            Welcome!
          </h1>
          <p style={{ color: '#e5e7eb' }}>
            Here's what's happening in the Community.
          </p>
        </div>

        {/* Featured Content */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#fff' }}>Featured</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card style={{ background: '#181926', color: '#fff', border: 'none', boxShadow: '0 2px 8px #0002' }}>
              <CardHeader style={{ color: '#fff' }}>
                <CardTitle style={{ color: '#fff' }}>Family Photos</CardTitle>
                <CardDescription style={{ color: '#e5e7eb' }}>Latest shared memories</CardDescription>
              </CardHeader>
              <CardContent style={{ color: '#e5e7eb' }}>
                <p>View the latest photos shared by your family members.</p>
              </CardContent>
              <CardFooter style={{ borderTop: '1px solid #232336' }}>
                <Button variant="outline" style={{ background: '#232336', color: '#fff', borderColor: '#35364a' }}>View Gallery</Button>
              </CardFooter>
            </Card>
            <Card style={{ background: '#181926', color: '#fff', border: 'none', boxShadow: '0 2px 8px #0002' }}>
              <CardHeader style={{ color: '#fff' }}>
                <CardTitle style={{ color: '#fff' }}>Family Chat</CardTitle>
                <CardDescription style={{ color: '#e5e7eb' }}>Stay connected</CardDescription>
              </CardHeader>
              <CardContent style={{ color: '#e5e7eb' }}>
                <p>Join the conversation with your family members.</p>
              </CardContent>
              <CardFooter style={{ borderTop: '1px solid #232336' }}>
                <Button variant="outline" style={{ background: '#232336', color: '#fff', borderColor: '#35364a' }}>Open Chat</Button>
              </CardFooter>
            </Card>
            <Card style={{ background: '#181926', color: '#fff', border: 'none', boxShadow: '0 2px 8px #0002' }}>
              <CardHeader style={{ color: '#fff' }}>
                <CardTitle style={{ color: '#fff' }}>Family Resources</CardTitle>
                <CardDescription style={{ color: '#e5e7eb' }}>Important documents</CardDescription>
              </CardHeader>
              <CardContent style={{ color: '#e5e7eb' }}>
                <p>Access important family documents and resources.</p>
              </CardContent>
              <CardFooter style={{ borderTop: '1px solid #232336' }}>
                <Button variant="outline" style={{ background: '#232336', color: '#fff', borderColor: '#35364a' }}>View Resources</Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#fff' }}>Upcoming Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card style={{ background: '#181926', color: '#fff', border: 'none', boxShadow: '0 2px 8px #0002' }}>
              <CardHeader className="flex flex-row items-center gap-4">
                <div style={{ background: '#232336', padding: '12px', borderRadius: '9999px' }}>
                  <CalendarDays className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base" style={{ color: '#fff' }}>Family Dinner</CardTitle>
                  <CardDescription style={{ color: '#e5e7eb' }}>Friday, 7:00 PM</CardDescription>
                </div>
              </CardHeader>
              <CardContent style={{ color: '#e5e7eb' }}>
                <p className="text-sm">Weekly family dinner at home.</p>
              </CardContent>
            </Card>
            <Card style={{ background: '#181926', color: '#fff', border: 'none', boxShadow: '0 2px 8px #0002' }}>
              <CardHeader className="flex flex-row items-center gap-4">
                <div style={{ background: '#232336', padding: '12px', borderRadius: '9999px' }}>
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-base" style={{ color: '#fff' }}>Family Meeting</CardTitle>
                  <CardDescription style={{ color: '#e5e7eb' }}>Saturday, 10:00 AM</CardDescription>
                </div>
              </CardHeader>
              <CardContent style={{ color: '#e5e7eb' }}>
                <p className="text-sm">Monthly family planning meeting.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Questions with limit */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold" style={{ color: '#fff' }}>Recent Questions</h2>
            <Link href="/questions">
              <Button variant="ghost" style={{ color: '#60a5fa' }} className="flex items-center gap-1">
                See More <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <QuestionGrid limitCards={limitCards} showHeader={false} />
        </div>
      </div>
    </Layout>
  );
}
