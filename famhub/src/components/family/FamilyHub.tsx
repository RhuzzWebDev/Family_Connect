'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FamilyService, FamilyMember, Family } from '@/services/familyService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  Copy, 
  Check, 
  UserPlus, 
  RefreshCw, 
  Mail, 
  Calendar, 
  Badge, 
  Pencil, 
  Trash2, 
  AlertCircle,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { AddFamilyMemberModal } from '@/components/add-family-member-modal';
import FamilyInviteModal from './FamilyInvite';

export default function FamilyHub() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<FamilyMember | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyDetails, setFamilyDetails] = useState<Family | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [inviteCode, setInviteCode] = useState<string>("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Member detail modal state
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isFullWidth, setIsFullWidth] = useState(false);

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: '',
    persona: '',
    status: '',
    bio: '',
    phone_number: ''
  });

  useEffect(() => {
    if (status === 'authenticated' && session) {
      fetchFamilyData();
    } else if (status === 'unauthenticated') {
      setLoading(false);
      setError('You must be logged in to view family data');
    }
  }, [refreshTrigger, status, session]);

  async function fetchFamilyData() {
    try {
      setLoading(true);
      
      // Load current user first
      const user = await FamilyService.getCurrentUser();
      setCurrentUser(user);
      
      // Load all family members
      const allUsers = await FamilyService.getAllFamilyMembers();
      
      // Filter users to only include those from the same family
      let filteredMembers: FamilyMember[] = [];
      
      if (user.family_id) {
        // If user has a family_id, filter by that
        filteredMembers = allUsers.filter((member: FamilyMember) => 
          member.family_id === user.family_id
        );
      } else {
        // Otherwise, filter by last name
        filteredMembers = allUsers.filter((member: FamilyMember) => 
          member.last_name === user.last_name
        );
      }
      
      setFamilyMembers(filteredMembers);
      
      // Load family details
      const details = await FamilyService.getFamilyDetails();
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
      const code = await FamilyService.generateFamilyInviteCode();
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
  
  // Handle edit form input changes
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Start editing a member
  const handleEditMember = () => {
    setIsEditMode(true);
  };
  
  // Cancel editing and return to view mode
  const handleCancelEdit = () => {
    if (selectedMember) {
      // Reset form data to original values
      setEditFormData({
        first_name: selectedMember.first_name,
        last_name: selectedMember.last_name,
        email: selectedMember.email,
        role: selectedMember.role,
        persona: selectedMember.persona || 'Children',
        status: selectedMember.status,
        bio: selectedMember.bio || '',
        phone_number: selectedMember.phone_number || ''
      });
    }
    setIsEditMode(false);
    setFormError(null);
  };
  
  // Save member changes
  const handleSaveMember = async () => {
    if (!selectedMember) return;
    
    try {
      setIsSubmitting(true);
      setFormError(null);
      
      await FamilyService.updateFamilyMember(selectedMember.id, {
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        email: editFormData.email,
        role: editFormData.role,
        persona: editFormData.persona,
        status: editFormData.status,
        bio: editFormData.bio,
        phone_number: editFormData.phone_number
      });
      
      // Update the local state with the edited member
      setFamilyMembers(prev => prev.map(member => 
        member.id === selectedMember.id ? {
          ...member,
          ...editFormData
        } : member
      ));
      
      // Update the selected member
      setSelectedMember(prev => prev ? {
        ...prev,
        ...editFormData
      } : null);
      
      setIsEditMode(false);
      toast.success('Family member updated successfully');
    } catch (err) {
      console.error('Error updating family member:', err);
      setFormError(err instanceof Error ? err.message : 'Failed to update family member');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Open delete confirmation dialog
  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };
  
  // Delete a family member
  const handleDeleteMember = async () => {
    if (!selectedMember) return;
    
    try {
      setIsSubmitting(true);
      
      await FamilyService.deleteFamilyMember(selectedMember.id);
      
      // Remove the deleted member from the local state
      setFamilyMembers(prev => prev.filter(member => member.id !== selectedMember.id));
      
      // Close all dialogs
      setIsDeleteDialogOpen(false);
      setIsDetailModalOpen(false);
      
      toast.success('Family member deleted successfully');
    } catch (err) {
      console.error('Error deleting family member:', err);
      setIsDeleteDialogOpen(false);
      setFormError(err instanceof Error ? err.message : 'Failed to delete family member');
    } finally {
      setIsSubmitting(false);
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

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    
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
    <div className="space-y-6" style={{ background: '#0F1017', color: '#fff', minHeight: '100vh', padding: '1.5rem' }}>
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
          <FamilyInviteModal />
          <AddFamilyMemberModal 
            buttonLabel="Add Family Member" 
            isAdmin={false} 
            onMemberAdded={handleMemberAdded}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          />
        </div>
      </div>

      <Card style={{ background: '#181926', color: '#fff', border: '1px solid #232336' }}>
        <CardHeader style={{ color: '#fff' }}>
          <div className="flex justify-between items-center">
            <CardTitle>Family Members</CardTitle>
            <span className="text-sm text-gray-500">{familyMembers.length} members</span>
          </div>
          <CardDescription>
            View and manage your family members
          </CardDescription>
        </CardHeader>
        <CardContent style={{ color: '#fff' }}>
          {familyMembers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {familyMembers.map((member) => (
                <Card 
                  key={member.id} 
                  className="overflow-hidden border cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-lg" 
                  style={{ background: '#232336', color: '#fff', border: '1px solid #232336' }}
                  onClick={() => {
                    setSelectedMember(member);
                    setEditFormData({
                      first_name: member.first_name,
                      last_name: member.last_name,
                      email: member.email,
                      role: member.role,
                      persona: member.persona || 'Children',
                      status: member.status,
                      bio: member.bio || '',
                      phone_number: member.phone_number || ''
                    });
                    setIsDetailModalOpen(true);
                    setIsEditMode(false);
                    setFormError(null);
                  }}
                >
                  <CardHeader className="py-3" style={{ background: '#20212b', color: '#e5e7eb' }}>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center font-semibold" style={{ background: '#23233b', color: '#60a5fa' }}>
                        {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                      </div>
                      {member.first_name} {member.last_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3" style={{ color: '#fff' }}>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-200">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-200">Role: {member.role}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-200">Joined: {formatDate(member.created_at)}</span>
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
              <h3 className="mt-4 text-lg font-medium text-gray-100">No family members yet</h3>
              <p className="mt-2 text-sm text-gray-400">
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
        <DialogContent style={{ background: '#181926', color: '#fff' }}>
          <DialogHeader>
            <DialogTitle>Invite Family Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-300">
              Share this code with your family member. They will need to enter this code when registering to join your family.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 rounded-md font-mono text-sm" style={{ background: '#232336', color: '#fff' }}>
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

      {/* Member Detail Modal */}
      {isDetailModalOpen && selectedMember && (
        <div 
          className={`fixed inset-y-0 right-0 z-50 w-full ${isFullWidth ? 'md:w-full' : 'md:w-1/2'} bg-black/70 transform transition-all duration-300 ease-in-out translate-x-0`}
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div
            className="h-full flex flex-col overflow-hidden rounded-l-2xl"
            style={{ background: '#181926', color: '#fff', border: '1px solid #232336' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4" style={{ background: '#20212b', borderBottom: '1px solid #232336' }}>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-white mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFullWidth(!isFullWidth);
                  }}
                >
                  {isFullWidth ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <div className="h-8 w-8 rounded-full flex items-center justify-center font-semibold" style={{ background: '#23233b', color: '#60a5fa' }}>
                  {selectedMember.first_name.charAt(0)}{selectedMember.last_name.charAt(0)}
                </div>
                <span className="font-medium text-white">{isEditMode ? 'Edit Profile' : 'Profile Overview'}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-gray-400 hover:text-white" 
                onClick={() => setIsDetailModalOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 flex-grow overflow-y-auto space-y-4" style={{ color: '#fff' }}>
              {formError && (
                <Alert variant="destructive" className="mb-4 rounded-lg bg-red-900/30 text-white border border-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              {isEditMode ? (
                // Edit Form
                <div className="space-y-6">
                  <div className="text-lg font-semibold text-white">Edit Member Information</div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name" className="text-gray-300">First Name</Label>
                      <Input
                        id="first_name"
                        name="first_name"
                        value={editFormData.first_name}
                        onChange={handleEditInputChange}
                        className="rounded-lg bg-[#232336] text-white border-[#35364a] placeholder-gray-400 focus-visible:ring-blue-600 focus:bg-[#232336]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name" className="text-gray-300">Last Name</Label>
                      <Input
                        id="last_name"
                        name="last_name"
                        value={editFormData.last_name}
                        onChange={handleEditInputChange}
                        className="rounded-lg bg-[#232336] text-white border-[#35364a] placeholder-gray-400 focus-visible:ring-blue-600 focus:bg-[#232336]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-300">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={editFormData.email}
                      onChange={handleEditInputChange}
                      className="rounded-lg bg-[#232336] text-white border-[#35364a] placeholder-gray-400 focus-visible:ring-blue-600 focus:bg-[#232336]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-gray-300">Role</Label>
                      <select
                        id="role"
                        name="role"
                        value={editFormData.role}
                        onChange={handleEditInputChange}
                        className="w-full rounded-lg border px-3 py-2 bg-[#232336] text-white border-[#35364a] focus-visible:ring-blue-600 focus:bg-[#232336]"
                      >
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Grandfather">Grandfather</option>
                        <option value="Grandmother">Grandmother</option>
                        <option value="Older Brother">Older Brother</option>
                        <option value="Older Sister">Older Sister</option>
                        <option value="Middle Brother">Middle Brother</option>
                        <option value="Middle Sister">Middle Sister</option>
                        <option value="Youngest Brother">Youngest Brother</option>
                        <option value="Youngest Sister">Youngest Sister</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="persona" className="text-gray-300">Persona</Label>
                      <select
                        id="persona"
                        name="persona"
                        value={editFormData.persona}
                        onChange={handleEditInputChange}
                        className="w-full rounded-lg border px-3 py-2 bg-[#232336] text-white border-[#35364a] focus-visible:ring-blue-600 focus:bg-[#232336]"
                      >
                        <option value="Parent">Parent</option>
                        <option value="Children">Children</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status" className="text-gray-300">Status</Label>
                      <select
                        id="status"
                        name="status"
                        value={editFormData.status}
                        onChange={handleEditInputChange}
                        className="w-full rounded-lg border px-3 py-2 bg-[#232336] text-white border-[#35364a] focus-visible:ring-blue-600 focus:bg-[#232336]"
                      >
                        <option value="Active">Active</option>
                        <option value="Validating">Validating</option>
                        <option value="Not Active">Not Active</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone_number" className="text-gray-300">Phone Number</Label>
                      <Input
                        id="phone_number"
                        name="phone_number"
                        value={editFormData.phone_number}
                        onChange={handleEditInputChange}
                        className="rounded-lg bg-[#232336] text-white border-[#35364a] placeholder-gray-400 focus-visible:ring-blue-600 focus:bg-[#232336]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-gray-300">Bio</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={editFormData.bio}
                      onChange={handleEditInputChange}
                      className="min-h-[100px] rounded-lg bg-[#232336] text-white border-[#35364a] placeholder-gray-400 focus-visible:ring-blue-600 focus:bg-[#232336]"
                    />
                  </div>
                </div>
              ) : (
                // View Details
                <div className="space-y-6">
                  <div className="text-lg font-semibold text-white">Member Information</div>
                  
                  <div className="p-4 rounded-lg space-y-4" style={{ background: '#232336', border: '1px solid #35364a' }}>
                    <div className="flex items-center gap-3 pb-3" style={{ borderBottom: '1px solid #35364a' }}>
                      <div className="h-12 w-12 rounded-full flex items-center justify-center font-semibold text-white text-lg" style={{ background: '#23233b', color: '#60a5fa' }}>
                        {selectedMember.first_name.charAt(0)}{selectedMember.last_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-white">{selectedMember.first_name} {selectedMember.last_name}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${selectedMember.status === 'Active' ? 'bg-green-100 text-green-800' : 
                            selectedMember.status === 'Validating' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'}`}>
                          {selectedMember.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Email</p>
                        <p className="font-medium text-white">{selectedMember.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Phone</p>
                        <p className="font-medium text-white">{selectedMember.phone_number || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Role</p>
                        <p className="font-medium text-white">{selectedMember.role}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Persona</p>
                        <p className="font-medium text-white">{selectedMember.persona || 'Children'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Joined</p>
                        <p className="font-medium text-white">{formatDate(selectedMember.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Family ID</p>
                        <p className="font-medium text-white truncate">{selectedMember.family_id || 'None'}</p>
                      </div>
                    </div>
                    
                    {selectedMember.bio && (
                      <div className="pt-3" style={{ borderTop: '1px solid #35364a' }}>
                        <p className="text-gray-400">Bio</p>
                        <p className="mt-1 font-medium text-white">{selectedMember.bio}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4" style={{ borderTop: '1px solid #232336' }}>
              {isEditMode ? (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="rounded-lg border-gray-700 hover:bg-gray-800 hover:text-white text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveMember}
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex justify-between">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteClick}
                    className="rounded-lg text-white"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleEditMember}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit Profile
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the family member
              {selectedMember && ` ${selectedMember.first_name} ${selectedMember.last_name}`} and remove their data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
