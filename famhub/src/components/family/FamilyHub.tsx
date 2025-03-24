'use client';

import { useState, useEffect } from 'react';
import { SupabaseService } from '@/services/supabaseService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Check, UserPlus } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { User, Family } from '@/lib/supabase';

type FamilyMember = Omit<User, 'password'>;

export default function FamilyHub() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyDetails, setFamilyDetails] = useState<Family | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  useEffect(() => {
    async function loadFamilyData() {
      try {
        setLoading(true);
        
        // Load family members
        const members = await SupabaseService.getFamilyMembers();
        setFamilyMembers(members);
        
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
    
    loadFamilyData();
  }, []);

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

  if (loading) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          {familyDetails ? `${familyDetails.family_name} Family Hub` : 'Your Family Hub'}
        </h2>
        <Button onClick={generateInviteCode} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Family Member
        </Button>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Family Members</h3>
        {familyMembers.length > 0 ? (
          <div className="space-y-4">
            {familyMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                    {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{member.first_name} {member.last_name}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                  {member.role}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No family members found</p>
        )}
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
