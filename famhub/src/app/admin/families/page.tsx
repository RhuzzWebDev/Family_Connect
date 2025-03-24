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
  Eye
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
  TableHead,
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

type Family = {
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
  
  // Form states
  const [newFamilyData, setNewFamilyData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Father',
    status: 'Active' as 'Active' | 'Validating' | 'Not Active'
  });
  
  const [editMemberData, setEditMemberData] = useState({
    status: '' as 'Active' | 'Validating' | 'Not Active'
  });

  useEffect(() => {
    const fetchFamilies = async () => {
      try {
        const data = await SupabaseService.getAllFamilies();
        setFamilies(data);
      } catch (err) {
        console.error('Error fetching families:', err);
        setError(err instanceof Error ? err.message : 'Failed to load families');
      } finally {
        setLoading(false);
      }
    };

    fetchFamilies();
  }, []);

  const filteredFamilies = families.filter(family => 
    family.familyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddFamily = async () => {
    try {
      setLoading(true);
      
      // Create the parent user
      await SupabaseService.createUser({
        first_name: newFamilyData.firstName,
        last_name: newFamilyData.lastName,
        email: newFamilyData.email,
        password: newFamilyData.password,
        status: newFamilyData.status,
        role: newFamilyData.role,
        persona: 'Parent'
      });
      
      // Refresh the families list
      const updatedFamilies = await SupabaseService.getAllFamilies();
      setFamilies(updatedFamilies);
      
      // Reset form and close dialog
      setNewFamilyData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'Father',
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

  const handleUpdateMemberStatus = async () => {
    if (!selectedMember) return;
    
    try {
      setLoading(true);
      await SupabaseService.updateUserStatus(selectedMember.id, editMemberData.status);
      
      // Refresh the families list
      const updatedFamilies = await SupabaseService.getAllFamilies();
      setFamilies(updatedFamilies);
      
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
      const updatedFamilies = await SupabaseService.getAllFamilies();
      setFamilies(updatedFamilies);
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

  const viewFamilyMembers = async (lastName: string) => {
    try {
      setLoading(true);
      const members = await SupabaseService.getFamilyMembersByLastName(lastName);
      // setFamilyMembers(members);
      // setSelectedFamily(lastName);
      // setShowMembersDialog(true);
    } catch (error) {
      console.error('Error fetching family members:', error);
      setError('Failed to load family members. Please try again.');
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-2xl font-bold">Family Accounts</h1>
          
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
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Family</DialogTitle>
                  <DialogDescription>
                    Create a new family by adding a parent user.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={newFamilyData.firstName}
                        onChange={(e) => setNewFamilyData({...newFamilyData, firstName: e.target.value})}
                        placeholder="John"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={newFamilyData.lastName}
                        onChange={(e) => setNewFamilyData({...newFamilyData, lastName: e.target.value})}
                        placeholder="Smith"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newFamilyData.email}
                      onChange={(e) => setNewFamilyData({...newFamilyData, email: e.target.value})}
                      placeholder="john.smith@example.com"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newFamilyData.password}
                      onChange={(e) => setNewFamilyData({...newFamilyData, password: e.target.value})}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={newFamilyData.role}
                        onValueChange={(value) => setNewFamilyData({...newFamilyData, role: value})}
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
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={newFamilyData.status}
                        onValueChange={(value: 'Active' | 'Validating' | 'Not Active') => 
                          setNewFamilyData({...newFamilyData, status: value})
                        }
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
                  <Button variant="outline" onClick={() => setIsAddFamilyOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddFamily} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Family'}
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
        
        {/* Families List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredFamilies.length > 0 ? (
            filteredFamilies.map((family) => (
              <Card key={family.familyName} className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{family.familyName} Family</h2>
                      <p className="text-sm text-gray-500">
                        {family.memberCount} {family.memberCount === 1 ? 'member' : 'members'} • Created {formatDate(family.createdAt)}
                      </p>
                    </div>
                  </div>
                  
                  <Dialog open={isViewMembersOpen && selectedFamily?.familyName === family.familyName} 
                          onOpenChange={(open) => {
                            setIsViewMembersOpen(open);
                            if (!open) setSelectedFamily(null);
                          }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" onClick={() => setSelectedFamily(family)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Members
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>{family.familyName} Family Members</DialogTitle>
                        <DialogDescription>
                          Manage family members and their account status.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="mt-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {family.members.map((member) => (
                              <TableRow key={member.id}>
                                <TableCell className="font-medium">
                                  {member.first_name} {member.last_name}
                                </TableCell>
                                <TableCell>{member.email}</TableCell>
                                <TableCell>{member.role}</TableCell>
                                <TableCell>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                    ${member.status === 'Active' ? 'bg-green-100 text-green-800' : 
                                      member.status === 'Validating' ? 'bg-yellow-100 text-yellow-800' : 
                                      'bg-red-100 text-red-800'}`}>
                                    {member.status}
                                  </span>
                                </TableCell>
                                <TableCell>{formatDate(member.created_at)}</TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <span className="sr-only">Open menu</span>
                                        <ChevronRight className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <Dialog open={isEditMemberOpen && selectedMember?.id === member.id}
                                              onOpenChange={(open) => {
                                                setIsEditMemberOpen(open);
                                                if (!open) setSelectedMember(null);
                                              }}>
                                        <DialogTrigger asChild>
                                          <DropdownMenuItem onSelect={(e) => {
                                            e.preventDefault();
                                            setSelectedMember(member);
                                            setEditMemberData({ status: member.status });
                                          }}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit Status
                                          </DropdownMenuItem>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md">
                                          <DialogHeader>
                                            <DialogTitle>Update Member Status</DialogTitle>
                                            <DialogDescription>
                                              Change the account status for {member.first_name} {member.last_name}.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="grid gap-4 py-4">
                                            <div className="flex flex-col gap-2">
                                              <Label htmlFor="status">Status</Label>
                                              <Select
                                                value={editMemberData.status}
                                                onValueChange={(value: 'Active' | 'Validating' | 'Not Active') => 
                                                  setEditMemberData({...editMemberData, status: value})
                                                }
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
                                            <Button variant="outline" onClick={() => setIsEditMemberOpen(false)}>
                                              Cancel
                                            </Button>
                                            <Button onClick={handleUpdateMemberStatus} disabled={loading}>
                                              {loading ? 'Updating...' : 'Update Status'}
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      </Dialog>
                                      
                                      <DropdownMenuItem onSelect={(e) => {
                                        e.preventDefault();
                                        handleDeleteMember(member.id);
                                      }}>
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
                    </DialogContent>
                  </Dialog>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No families found</h3>
              <p className="mt-2 text-sm text-gray-500">
                {searchTerm ? 'Try a different search term or' : 'Get started by'} adding a new family.
              </p>
              <Button className="mt-4" onClick={() => setIsAddFamilyOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Family
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
