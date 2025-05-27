'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { AdminDashboardService } from '@/services/AdminDashboardService';
import { Card } from '@/components/ui/card';
import { 
  Users, 
  Home, 
  MessageSquare, 
  UserCheck,
  Calendar,
  UserPlus
} from 'lucide-react';
import Link from 'next/link';
import { AddFamilyMemberModal } from '@/components/add-family-member-modal';
import { Button } from '@/components/ui/button';

interface DashboardStats {
  totalFamilies: number;
  totalUsers: number | null;
  totalQuestions: number | null;
  recentUsers: any[];
  recentQuestions: any[];
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const data = await AdminDashboardService.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const handleMemberAdded = () => {
    // Refresh dashboard stats after adding a member
    fetchDashboardStats();
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await AdminDashboardService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#232336] border-t-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-[#232336] border border-red-500 text-red-300 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading dashboard</p>
          <p className="text-sm">{error}</p>
        </div>
      </AdminLayout>
    );
  }

  if (!stats) {
    return (
      <AdminLayout>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          <p>No dashboard data available</p>
        </div>
      </AdminLayout>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-6 flex items-center space-x-4 bg-[#1E1F29] border border-[#232336]">
            <div className="h-12 w-12 rounded-full bg-[#232336] text-blue-400 flex items-center justify-center">
              <Home className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Families</p>
              <p className="text-2xl font-bold text-white">{stats.totalFamilies}</p>
            </div>
          </Card>
          
          <Card className="p-6 flex items-center space-x-4 bg-[#1E1F29] border border-[#232336]">
            <div className="h-12 w-12 rounded-full bg-[#232336] text-green-400 flex items-center justify-center">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Active Users</p>
              <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
            </div>
          </Card>
          
          <Card className="p-6 flex items-center space-x-4 bg-[#1E1F29] border border-[#232336]">
            <div className="h-12 w-12 rounded-full bg-[#232336] text-purple-400 flex items-center justify-center">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Questions</p>
              <p className="text-2xl font-bold text-white">{stats.totalQuestions}</p>
            </div>
          </Card>
        </div>
        
        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <Card className="p-6 bg-[#1E1F29] border border-[#232336]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Users</h2>
              <Link href="/admin/families" className="text-sm text-blue-400 hover:text-blue-300">
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {stats.recentUsers.length > 0 ? (
                stats.recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-[#232336] rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-[#1E1F29] flex items-center justify-center text-gray-300">
                        {user.first_name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-white">{user.first_name} {user.last_name}</p>
                        <p className="text-sm text-gray-400">{user.role} • {user.persona}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatDate(user.created_at)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-4">No recent users</p>
              )}
            </div>
          </Card>
          
          {/* Recent Questions */}
          <Card className="p-6 bg-[#1E1F29] border border-[#232336]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Questions</h2>
              <Link href="/admin/questions" className="text-sm text-blue-400 hover:text-blue-300">
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {stats.recentQuestions.length > 0 ? (
                stats.recentQuestions.map((question) => (
                  <div key={question.id} className="p-3 bg-[#232336] rounded-lg">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="h-8 w-8 rounded-full bg-[#1E1F29] flex items-center justify-center text-gray-300">
                        {question.user && question.user[0] && question.user[0].first_name 
                          ? question.user[0].first_name[0] 
                          : '?'}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {question.user && question.user[0] 
                            ? `${question.user[0].first_name} ${question.user[0].last_name}` 
                            : 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(question.created_at)}</p>
                      </div>
                    </div>
                    <p className="text-sm line-clamp-2">{question.question}</p>
                    {question.media_type && (
                      <div className="mt-2 text-xs text-gray-400 flex items-center">
                        <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mr-1"></span>
                        Has {question.media_type} attachment
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-4">No recent questions</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
