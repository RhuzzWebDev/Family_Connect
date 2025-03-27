'use client';

import { useState, useEffect } from 'react';
import { SupabaseService } from '@/services/supabaseService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Check, UserPlus, RefreshCw, Mail, Calendar, Badge } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { User, Family } from '@/lib/supabase';
import { AddFamilyMemberModal } from '@/components/add-family-member-modal';

type FamilyMember = Omit<User, 'password'>;

export default function FamilyHub() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyDetails, setFamilyDetails] = useState<Family | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentUser, setCurrentUser] = useState<FamilyMember | null>(null);

  useEffect(() => {
    fetchFamilyData();
  }, [refreshTrigger]);

  async function fetchFamilyData() {
    try {
      setLoading(true);
      
      // Load current user first
      const user = await SupabaseService.getCurrentUser();
      setCurrentUser(user);
      
      // Load all users
      const allUsers = await SupabaseService.getFamilyMembers();
      
      // Filter users to only include those from the same family
      let filteredMembers: FamilyMember[] = [];
      
      if (user.family_id) {
        // If user has a family_id, filter by that
        filteredMembers = allUsers.filter(member => 
          member.family_id === user.family_id
        );
      } else {
        // Otherwise, filter by last name
        filteredMembers = allUsers.filter(member => 
          member.last_name === user.last_name
        );
      }
      
      setFamilyMembers(filteredMembers);
      
      // Load family details
      const details = await SupabaseService.getFamilyDetails();
      setFamilyDetails(details);
      
      setError(null);
    } catch (err) {
      console.error('Error loading family data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load family data');
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const generateInviteCode = async () => {
    try {
      const code = await SupabaseService.generateFamilyInviteCode();
      setInviteCode(code);
      setInviteDialogOpen(true);
    } catch (err) {
      console.error('Error generating invite code:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate invite code');
    }
  };

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleMemberAdded = () => {
    // Refresh family members list when a new member is added
    handleRefresh();
  };

  const getRoleColor = (role: string) => {
    const roleColors: Record<string, string> = {
      'Father': 'bg-blue-100 text-blue-800',
      'Mother': 'bg-pink-100 text-pink-800',
      'Grandfather': 'bg-indigo-100 text-indigo-800',
      'Grandmother': 'bg-purple-100 text-purple-800',
      'Older Brother': 'bg-green-100 text-green-800',
      'Older Sister': 'bg-teal-100 text-teal-800',
      'Middle Brother': 'bg-yellow-100 text-yellow-800',
      'Middle Sister': 'bg-orange-100 text-orange-800',
      'Youngest Brother': 'bg-red-100 text-red-800',
      'Youngest Sister': 'bg-rose-100 text-rose-800'
    };
    
    return roleColors[role] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  if (loading && !familyMembers.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  const familyName = currentUser?.last_name || (familyDetails?.family_name || 'Your');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">
            {`${familyName} Family Hub`}
          </h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh} 
            className="h-8 w-8"
            title="Refresh family members"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <AddFamilyMemberModal 
            buttonLabel="Add Family Member" 
            isAdmin={false} 
            onMemberAdded={handleMemberAdded}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          />
          <Button onClick={generateInviteCode} variant="outline" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Invite via Code
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Family Members</CardTitle>
            <span className="text-sm text-gray-500">{familyMembers.length} members</span>
          </div>
          <CardDescription>
            View and manage your family members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {familyMembers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {familyMembers.map((member) => (
                <Card key={member.id} className="overflow-hidden border">
                  <CardHeader className={`${getRoleColor(member.role)} py-3`}>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-blue-600 font-semibold">
                        {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                      </div>
                      {member.first_name} {member.last_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">Role: {member.role}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">Joined: {formatDate(member.created_at)}</span>
                    </div>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${member.status === 'Active' ? 'bg-green-100 text-green-800' : 
                          member.status === 'Validating' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {member.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No family members yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Get started by adding your first family member.
              </p>
              <AddFamilyMemberModal 
                buttonLabel="Add Family Member" 
                isAdmin={false} 
                onMemberAdded={handleMemberAdded}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Family Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-500">
              Share this code with your family member. They will need to enter this code when registering to join your family.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-gray-50 rounded-md font-mono text-sm">
                {inviteCode}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={copyInviteCode}
                className="h-10 w-10"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
