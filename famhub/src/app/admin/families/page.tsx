'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { SupabaseService } from '@/services/supabaseService';
import { Card } from '@/components/ui/card';
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
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { User } from '@/lib/supabase';
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
    status: '' as 'Active' | 'Validating' | 'Not Active'
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
      
      console.log('Family created successfully:', result);
      
      // Refresh the families list
      handleRefreshFamilies();
      
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
    } catch (err) {
      console.error('Error adding family:', err);
      setError(err instanceof Error ? err.message : 'Failed to add family');
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

  const handleUpdateMemberStatus = async () => {
    if (!selectedMember) return;
    
    try {
      setLoading(true);
      await SupabaseService.updateUserStatus(selectedMember.id, editMemberData.status);
      
      // Refresh the families list
      handleRefreshFamilies();
      
      // Close dialog
      setIsEditMemberOpen(false);
    } catch (err) {
      console.error('Error updating member status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update member status');
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
      
      // Refresh the families list
      handleRefreshFamilies();
    } catch (err) {
      console.error('Error deleting member:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete member');
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
            <h1 className="text-2xl font-bold">Family Accounts</h1>
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
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search families..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Dialog open={isAddFamilyOpen} onOpenChange={setIsAddFamilyOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Family
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Family</DialogTitle>
                  <DialogDescription>
                    Create a new family account with a primary member.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="familyName">Family Name</Label>
                    <Input 
                      id="familyName" 
                      value={newFamilyData.familyName} 
                      onChange={(e) => setNewFamilyData({...newFamilyData, familyName: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName" 
                        value={newFamilyData.firstName} 
                        onChange={(e) => setNewFamilyData({...newFamilyData, firstName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        value={newFamilyData.lastName} 
                        onChange={(e) => setNewFamilyData({...newFamilyData, lastName: e.target.value})}
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
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password"
                      value={newFamilyData.password} 
                      onChange={(e) => setNewFamilyData({...newFamilyData, password: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select 
                        value={newFamilyData.role} 
                        onValueChange={(value: 'Father' | 'Mother' | 'Grandfather' | 'Grandmother') => setNewFamilyData({...newFamilyData, role: value})}
                      >
                        <SelectTrigger>
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
                        <SelectTrigger>
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
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddFamilyOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddFamily} disabled={loading}>
                    {loading ? 'Adding...' : 'Add Family'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
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
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {selectedFamily?.familyName} Family Members
              </DialogTitle>
            </DialogHeader>
            
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
                    className="bg-blue-600 hover:bg-blue-700 text-white"
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
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
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
                              <Button variant="ghost" size="sm">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMember(member);
                                  setEditMemberData({ status: member.status });
                                  setIsEditMemberOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Status
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
          </DialogContent>
        </Dialog>
        
        {/* Edit Member Status Dialog */}
        <Dialog open={isEditMemberOpen} onOpenChange={setIsEditMemberOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Member Status</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                  {selectedMember?.first_name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{selectedMember?.first_name} {selectedMember?.last_name}</p>
                  <p className="text-sm text-gray-500">{selectedMember?.email}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={editMemberData.status} 
                  onValueChange={(value: 'Active' | 'Validating' | 'Not Active') => setEditMemberData({...editMemberData, status: value})}
                >
                  <SelectTrigger>
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
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditMemberOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateMemberStatus} disabled={loading}>
                {loading ? 'Updating...' : 'Update Status'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
