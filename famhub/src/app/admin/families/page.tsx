'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { SupabaseService } from '@/services/supabaseService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Search, 
  Plus, 
  ChevronRight, 
  UserPlus,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  Key,
  Copy,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { User } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddFamilyMemberModal } from "@/components/add-family-member-modal";
import { cn, generatePassword } from '@/lib/utils';

type Family = {
  id: string;
  familyName: string;
  members: User[];
  memberCount: number;
  createdAt: string;
};

export default function AdminFamiliesPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [isAddFamilyOpen, setIsAddFamilyOpen] = useState(false);
  const [isViewMembersOpen, setIsViewMembersOpen] = useState(false);
  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [isDeleteFamilyOpen, setIsDeleteFamilyOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Form states
  const [newFamilyData, setNewFamilyData] = useState({
    familyName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Father' as 'Father' | 'Mother' | 'Grandfather' | 'Grandmother', 
    status: 'Active' as 'Active' | 'Validating' | 'Not Active'
  });
  
  const [newMemberData, setNewMemberData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Mother' as const,
    status: 'Active' as 'Active' | 'Validating' | 'Not Active'
  });

  const [editMemberData, setEditMemberData] = useState({
    status: '' as 'Active' | 'Validating' | 'Not Active',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    role: '' as 'Father' | 'Mother' | 'Grandfather' | 'Grandmother' | 'Older Brother' | 'Older Sister' | 'Middle Brother' | 'Middle Sister' | 'Youngest Brother' | 'Youngest Sister'
  });

  useEffect(() => {
    fetchFamilies();
  }, [refreshTrigger]);

  const fetchFamilies = async () => {
    try {
      setLoading(true);
      const data = await SupabaseService.getAllFamilies();
      setFamilies(data);
    } catch (err) {
      console.error('Error fetching families:', err);
      setError(err instanceof Error ? err.message : 'Failed to load families');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshFamilies = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const filteredFamilies = families.filter(family => 
    family.familyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddFamily = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!newFamilyData.familyName) {
        setError('Family name is required');
        return;
      }
      
      if (!newFamilyData.email || !newFamilyData.password) {
        setError('Email and password are required for the family member');
        return;
      }
      
      // Create the family with the parent member
      const result = await SupabaseService.createFamilyWithMember(
        newFamilyData.familyName,
        {
          first_name: newFamilyData.firstName,
          last_name: newFamilyData.lastName,
          email: newFamilyData.email,
          password: newFamilyData.password,
          status: newFamilyData.status,
          role: newFamilyData.role,
          persona: 'Parent'
        }
      );
      
      if (!result || !result.family || !result.user) {
        throw new Error('Failed to create family or user - incomplete result returned');
      }
      
      console.log('Family created successfully:', {
        family_id: result.family.id,
        user_id: result.user.id,
        family_name: result.family.family_name,
        user_ref: result.family.user_ref
      });
      
      // Show success message
      toast.success(
        `Family "${result.family.family_name}" created successfully with member ${result.user.first_name} ${result.user.last_name}`
      );
      
      // Refresh the families list
      await handleRefreshFamilies();
      
      // Reset form and close dialog
      setNewFamilyData({
        familyName: '',
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'Father' as 'Father' | 'Mother' | 'Grandfather' | 'Grandmother',
        status: 'Active' as 'Active' | 'Validating' | 'Not Active'
      });
      setIsAddFamilyOpen(false);
    } catch (err: any) {
      console.error('Error adding family:', err);
      
      // Provide more detailed error messages
      let errorMessage = 'Failed to add family';
      
      if (err?.code === 'PGRST116') {
        // This error occurs when no rows are returned but we expected one
        // The operation might have actually succeeded, so let's try to refresh the families list
        console.log('Got PGRST116 error, but the operation might have succeeded. Refreshing families list...');
        
        // Try to refresh the families list
        await handleRefreshFamilies();
        
        // Show a warning instead of an error
        toast.warning('Family may have been created but we encountered a data retrieval issue. Please check if the family appears in the list.');
        
        // Reset form and close dialog
        setNewFamilyData({
          familyName: '',
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          role: 'Father' as 'Father' | 'Mother' | 'Grandfather' | 'Grandmother',
          status: 'Active' as 'Active' | 'Validating' | 'Not Active'
        });
        setIsAddFamilyOpen(false);
        setLoading(false);
        return; // Exit early since we've handled this specific error
      } else if (err?.code === '42501') {
        // This is an RLS policy violation error
        console.log('Got RLS policy violation error. Attempting to refresh families list anyway...');
        
        // Try to refresh the families list - the operation might have partially succeeded
        await handleRefreshFamilies();
        
        errorMessage = 'Permission denied: You need admin privileges to create families. Please check if the SQL functions are properly installed.';
        toast.error(errorMessage);
        
        // Show a more detailed error in the console for debugging
        console.error('RLS policy violation details:', err);
        console.error('Please make sure the SQL functions in sql/rls_bypass_functions.sql are installed in your Supabase database.');
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedFamilyId) return;
    
    try {
      setLoading(true);
      
      // Get the selected family
      const selectedFamily = families.find(f => f.id === selectedFamilyId);
      
      if (!selectedFamily) {
        throw new Error('Selected family not found');
      }
      
      // Add the member to the family
      await SupabaseService.addMemberToFamily(
        selectedFamilyId,
        {
          first_name: newMemberData.firstName,
          last_name: newMemberData.lastName,
          email: newMemberData.email,
          password: newMemberData.password,
          status: newMemberData.status,
          role: newMemberData.role,
          persona: 'Children'
        }
      );
      
      // Refresh the families list
      handleRefreshFamilies();
      
      // Reset form and close dialog
      setNewMemberData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'Mother' as const,
        status: 'Active' as 'Active' | 'Validating' | 'Not Active'
      });
      setIsAddMemberOpen(false);
    } catch (err) {
      console.error('Error adding member:', err);
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMember = async () => {
    if (!selectedMember) return;
    
    try {
      setLoading(true);
      
      // Create update data object
      const updateData = {
        first_name: editMemberData.first_name,
        last_name: editMemberData.last_name,
        email: editMemberData.email,
        role: editMemberData.role,
        status: editMemberData.status,
        password: editMemberData.password || undefined
      };
      
      // Update the user with all data including password if provided
      await SupabaseService.updateFamilyMember(selectedMember.id, updateData);
      
      // Refresh the families list
      handleRefreshFamilies();
      
      // Close dialog
      setIsEditMemberOpen(false);
    } catch (err) {
      console.error('Error updating member:', err);
      setError(err instanceof Error ? err.message : 'Failed to update member');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this family member? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      await SupabaseService.deleteUser(userId);
      
      // Show success message
      toast.success('Family member deleted successfully');
      
      // Refresh the families list
      handleRefreshFamilies();
    } catch (err) {
      console.error('Error deleting member:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete member';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteFamily = async () => {
    if (!selectedFamilyId) return;
    
    try {
      setLoading(true);
      
      const result = await SupabaseService.deleteFamily(selectedFamilyId);
      
      // Refresh the families list
      handleRefreshFamilies();
      
      // Close dialog
      setIsDeleteFamilyOpen(false);
      
      // Show deletion statistics
      if (result.success) {
        const { stats } = result;
        
        // Create a toast with deletion statistics
        toast.success(
          <div className="space-y-1">
            <p className="font-semibold">Successfully deleted family "{stats.familyName}"</p>
            <ul className="text-sm space-y-0.5 list-disc pl-4">
              <li>{stats.usersDeleted} family members deleted</li>
              <li>{stats.questionsDeleted} questions deleted</li>
              <li>{stats.commentsDeleted} comments deleted</li>
              <li>{stats.conversationsDeleted} conversations deleted</li>
              <li>{stats.messagesDeleted} messages deleted</li>
            </ul>
          </div>,
          {
            duration: 5000 // Show for 5 seconds due to more content
          }
        );
      } else {
        const errorMsg = 'Failed to delete family. Some data may not have been properly cleaned up.';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('Error deleting family:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete family';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const viewFamilyMembers = (family: Family) => {
    setSelectedFamily(family);
    setSelectedFamilyId(family.id); 
    setIsViewMembersOpen(true);
  };
  
  const openAddMemberDialog = (familyId: string) => {
    setSelectedFamilyId(familyId);
    setIsAddMemberOpen(true);
  };

  const handleMemberAdded = () => {
    handleRefreshFamilies();
  };

  if (loading && families.length === 0) {
    return (
      <AdminLayout>
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Families</h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefreshFamilies} 
              className="h-8 w-8"
              title="Refresh families list"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search families..."
                className="pl-8 w-[200px] rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => setIsAddFamilyOpen(true)} className="rounded-lg">
              <Plus className="h-4 w-4 mr-2" />
              Add Family
            </Button>
          </div>
        </div>
        
        {/* Add Family Dialog */}
        <Dialog open={isAddFamilyOpen} onOpenChange={setIsAddFamilyOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-gray-200 shadow-lg rounded-xl p-0 overflow-hidden" style={{ backdropFilter: 'none' }}>
            <Card className="border-0 shadow-none">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <DialogTitle className="text-xl font-semibold">
                      Add New Family
                    </DialogTitle>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="familyName">Family Name</Label>
                      <Input 
                        id="familyName" 
                        value={newFamilyData.familyName} 
                        onChange={(e) => setNewFamilyData({...newFamilyData, familyName: e.target.value})}
                        className="rounded-lg"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input 
                          id="firstName" 
                          value={newFamilyData.firstName} 
                          onChange={(e) => setNewFamilyData({...newFamilyData, firstName: e.target.value})}
                          className="rounded-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input 
                          id="lastName" 
                          value={newFamilyData.lastName} 
                          onChange={(e) => setNewFamilyData({...newFamilyData, lastName: e.target.value})}
                          className="rounded-lg"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email"
                        value={newFamilyData.email} 
                        onChange={(e) => setNewFamilyData({...newFamilyData, email: e.target.value})}
                        className="rounded-lg"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <Input 
                            id="password" 
                            type="text"
                            value={newFamilyData.password} 
                            onChange={(e) => setNewFamilyData({...newFamilyData, password: e.target.value})}
                            className="rounded-lg pr-10"
                          />
                          {newFamilyData.password && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600"
                              onClick={() => {
                                navigator.clipboard.writeText(newFamilyData.password);
                                alert('Password copied to clipboard!');
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-lg"
                          onClick={() => {
                            const newPassword = generatePassword(10);
                            setNewFamilyData({...newFamilyData, password: newPassword});
                          }}
                          title="Generate random password"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">Leave empty to keep current password</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select 
                          value={newFamilyData.role} 
                          onValueChange={(value: 'Father' | 'Mother' | 'Grandfather' | 'Grandmother') => setNewFamilyData({...newFamilyData, role: value})}
                        >
                          <SelectTrigger className="rounded-lg">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Father">Father</SelectItem>
                            <SelectItem value="Mother">Mother</SelectItem>
                            <SelectItem value="Grandfather">Grandfather</SelectItem>
                            <SelectItem value="Grandmother">Grandmother</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select 
                          value={newFamilyData.status} 
                          onValueChange={(value: 'Active' | 'Validating' | 'Not Active') => setNewFamilyData({...newFamilyData, status: value})}
                        >
                          <SelectTrigger className="rounded-lg">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Validating">Validating</SelectItem>
                            <SelectItem value="Not Active">Not Active</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
                
                <DialogFooter className="p-4 pt-0">
                  <Button variant="outline" onClick={() => setIsAddFamilyOpen(false)} className="rounded-lg">Cancel</Button>
                  <Button onClick={handleAddFamily} disabled={loading} className="rounded-lg">
                    {loading ? 'Adding...' : 'Add Family'}
                  </Button>
                </DialogFooter>
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell className="font-medium">Family Name</TableCell>
                  <TableCell className="font-medium">Members</TableCell>
                  <TableCell className="font-medium">Created</TableCell>
                  <TableCell className="text-right font-medium">Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFamilies.length > 0 ? (
                  filteredFamilies.map((family, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{family.familyName}</TableCell>
                      <TableCell>{family.memberCount}</TableCell>
                      <TableCell>{formatDate(family.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => viewFamilyMembers(family)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          
                          {family.members.length > 0 && (
                            <AddFamilyMemberModal 
                              buttonLabel="Add"
                              isAdmin={true}
                              onMemberAdded={handleMemberAdded}
                              className="h-9 px-3 text-xs"
                              familyId={family.id}
                            />
                          )}
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => {
                              setSelectedFamilyId(family.id);
                              setIsDeleteFamilyOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                      {searchTerm ? 'No families match your search' : 'No families found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
        
        {/* View Family Members Dialog */}
        <Dialog open={isViewMembersOpen} onOpenChange={setIsViewMembersOpen}>
          <DialogContent className="sm:max-w-[90%] lg:max-w-[80%] bg-white border border-gray-200 shadow-lg rounded-xl p-0" style={{ backdropFilter: 'none' }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <DialogTitle className="text-xl font-semibold">
                  {selectedFamily?.familyName} Family Members
                </DialogTitle>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    {selectedFamily?.members.length} members
                  </p>
                  
                  {selectedFamily && selectedFamily.members.length > 0 && (
                    <AddFamilyMemberModal 
                      buttonLabel="Add Member"
                      isAdmin={true}
                      onMemberAdded={handleMemberAdded}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                      familyId={selectedFamily.id}
                    />
                  )}
                </div>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableCell className="font-medium">Name</TableCell>
                        <TableCell className="font-medium">Email</TableCell>
                        <TableCell className="font-medium">Role</TableCell>
                        <TableCell className="font-medium">Status</TableCell>
                        <TableCell className="text-right font-medium">Actions</TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedFamily?.members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                                {member.first_name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{member.first_name} {member.last_name}</p>
                                <p className="text-xs text-gray-500">{member.persona}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>{member.role}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              member.status === 'Active' ? 'bg-green-100 text-green-800' :
                              member.status === 'Validating' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {member.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="rounded-full">
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setEditMemberData({ 
                                      status: member.status, 
                                      password: '', 
                                      first_name: member.first_name, 
                                      last_name: member.last_name, 
                                      email: member.email, 
                                      role: member.role as 'Father' | 'Mother' | 'Grandfather' | 'Grandmother' | 'Older Brother' | 'Older Sister' | 'Middle Brother' | 'Middle Sister' | 'Youngest Brother' | 'Youngest Sister'
                                    });
                                    setIsEditMemberOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteMember(member.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Delete Family Confirmation Dialog */}
        <Dialog open={isDeleteFamilyOpen} onOpenChange={setIsDeleteFamilyOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-gray-200 shadow-lg rounded-xl p-0 overflow-hidden" style={{ backdropFilter: 'none' }}>
            <Card className="border-0 shadow-none">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <DialogTitle className="text-xl font-semibold text-red-600">
                      Delete Family
                    </DialogTitle>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                      <div>
                        <p className="font-medium text-red-600">Warning: This action cannot be undone</p>
                        <p className="text-sm text-gray-600">Deleting this family will permanently remove all family members and their data.</p>
                      </div>
                    </div>
                    
                    <p className="text-gray-600">
                      Are you sure you want to delete this family? All members, questions, and related data will be permanently deleted.
                    </p>
                  </div>
                </div>
                
                <DialogFooter className="p-4 pt-0">
                  <Button variant="outline" onClick={() => setIsDeleteFamilyOpen(false)} className="rounded-lg">Cancel</Button>
                  <Button 
                    onClick={handleDeleteFamily} 
                    disabled={loading} 
                    className="rounded-lg bg-red-600 hover:bg-red-700 text-white"
                  >
                    {loading ? 'Deleting...' : 'Delete Family'}
                  </Button>
                </DialogFooter>
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
        
        {/* Edit Member Status Dialog */}
        <Dialog open={isEditMemberOpen} onOpenChange={setIsEditMemberOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-gray-200 shadow-lg rounded-xl p-0 overflow-hidden" style={{ backdropFilter: 'none' }}>
            <Card className="border-0 shadow-none">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <DialogTitle className="text-xl font-semibold">
                      Edit User
                    </DialogTitle>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                        {selectedMember?.first_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{selectedMember?.first_name} {selectedMember?.last_name}</p>
                        <p className="text-xs text-gray-500">{selectedMember?.email}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="memberStatus">Status</Label>
                      <Select 
                        value={editMemberData.status} 
                        onValueChange={(value: 'Active' | 'Validating' | 'Not Active') => setEditMemberData({...editMemberData, status: value})}
                      >
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Validating">Validating</SelectItem>
                          <SelectItem value="Not Active">Not Active</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="memberPassword">Password</Label>
                      <div className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <Input 
                            id="memberPassword" 
                            type="text"
                            value={editMemberData.password} 
                            onChange={(e) => setEditMemberData({...editMemberData, password: e.target.value})}
                            className="rounded-lg pr-10"
                          />
                          {editMemberData.password && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600"
                              onClick={() => {
                                navigator.clipboard.writeText(editMemberData.password);
                                alert('Password copied to clipboard!');
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-lg"
                          onClick={() => {
                            const newPassword = generatePassword(10);
                            setEditMemberData({...editMemberData, password: newPassword});
                          }}
                          title="Generate random password"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">Leave empty to keep current password</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="memberFirstName">First Name</Label>
                        <Input 
                          id="memberFirstName" 
                          value={editMemberData.first_name} 
                          onChange={(e) => setEditMemberData({...editMemberData, first_name: e.target.value})}
                          className="rounded-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="memberLastName">Last Name</Label>
                        <Input 
                          id="memberLastName" 
                          value={editMemberData.last_name} 
                          onChange={(e) => setEditMemberData({...editMemberData, last_name: e.target.value})}
                          className="rounded-lg"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="memberEmail">Email</Label>
                      <Input 
                        id="memberEmail" 
                        type="email"
                        value={editMemberData.email} 
                        onChange={(e) => setEditMemberData({...editMemberData, email: e.target.value})}
                        className="rounded-lg"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="memberRole">Role</Label>
                      <Select 
                        value={editMemberData.role} 
                        onValueChange={(value: 'Father' | 'Mother' | 'Grandfather' | 'Grandmother' | 'Older Brother' | 'Older Sister' | 'Middle Brother' | 'Middle Sister' | 'Youngest Brother' | 'Youngest Sister') => setEditMemberData({...editMemberData, role: value})}
                      >
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Father">Father</SelectItem>
                          <SelectItem value="Mother">Mother</SelectItem>
                          <SelectItem value="Grandfather">Grandfather</SelectItem>
                          <SelectItem value="Grandmother">Grandmother</SelectItem>
                          <SelectItem value="Older Brother">Older Brother</SelectItem>
                          <SelectItem value="Older Sister">Older Sister</SelectItem>
                          <SelectItem value="Middle Brother">Middle Brother</SelectItem>
                          <SelectItem value="Middle Sister">Middle Sister</SelectItem>
                          <SelectItem value="Youngest Brother">Youngest Brother</SelectItem>
                          <SelectItem value="Youngest Sister">Youngest Sister</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <DialogFooter className="p-4 pt-0">
                  <Button variant="outline" onClick={() => setIsEditMemberOpen(false)} className="rounded-lg">Cancel</Button>
                  <Button onClick={handleUpdateMember} disabled={loading} className="rounded-lg">
                    {loading ? 'Updating...' : 'Update'}
                  </Button>
                </DialogFooter>
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
