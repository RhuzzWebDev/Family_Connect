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

export default function DashboardPage() {
  const [userName, setUserName] = useState('');
  const [limitCards, setLimitCards] = useState(6);

  useEffect(() => {
    const userEmail = sessionStorage.getItem('userEmail');
    if (!userEmail) {
      window.location.href = '/login';
      return;
    }

    // Fetch user name
    const fetchUserName = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('first_name')
        .eq('email', userEmail)
        .single();

      if (!error && data) {
        setUserName(data.first_name);
      }
    };

    fetchUserName();
  }, []);

  return (
    <Layout>
      <InnerNavbar />
      <div className="pl-6 pr-6 md:pl-8">
        {/* Welcome Section */}
        <div className="mb-8 pt-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome!
          </h1>
          <p className="text-gray-600">
            Here's what's happening in the Community.
          </p>
        </div>

        {/* Featured Content */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Featured</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Family Photos</CardTitle>
                <CardDescription>Latest shared memories</CardDescription>
              </CardHeader>
              <CardContent>
                <p>View the latest photos shared by your family members.</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline">View Gallery</Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Family Chat</CardTitle>
                <CardDescription>Stay connected</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Join the conversation with your family members.</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline">Open Chat</Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Family Resources</CardTitle>
                <CardDescription>Important documents</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Access important family documents and resources.</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline">View Resources</Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Upcoming Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <CalendarDays className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Family Dinner</CardTitle>
                  <CardDescription>Friday, 7:00 PM</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">Weekly family dinner at home.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Family Meeting</CardTitle>
                  <CardDescription>Saturday, 10:00 AM</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">Monthly family planning meeting.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Questions with limit */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Recent Questions</h2>
            <Link href="/questions">
              <Button variant="ghost" className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
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
