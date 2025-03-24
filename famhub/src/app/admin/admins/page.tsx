'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { SupabaseService } from '@/services/supabaseService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Search, 
  Plus, 
  ChevronRight, 
  Trash2,
  Edit,
  Key,
  Shield,
  ShieldAlert
} from 'lucide-react';
import { Admin } from '@/lib/supabase';
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminUsersPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [isEditAdminOpen, setIsEditAdminOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  
  // Form states
  const [newAdminData, setNewAdminData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'admin' as 'admin' | 'sysAdmin'
  });
  
  const [editAdminData, setEditAdminData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: '' as 'admin' | 'sysAdmin'
  });

  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        // Get current admin
        const adminEmail = sessionStorage.getItem('adminEmail');
        if (adminEmail) {
          const admin = await SupabaseService.getAdminByEmail(adminEmail);
          setCurrentAdmin(admin);
        }
        
        // Get all admins
        const data = await SupabaseService.getAllAdmins();
        setAdmins(data);
      } catch (err) {
        console.error('Error fetching admins:', err);
        setError(err instanceof Error ? err.message : 'Failed to load admin users');
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, []);

  const filteredAdmins = admins.filter(admin => 
    admin.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddAdmin = async () => {
    try {
      setLoading(true);
      
      // Create the admin user
      await SupabaseService.createAdmin({
        first_name: newAdminData.first_name,
        last_name: newAdminData.last_name,
        email: newAdminData.email,
        password: newAdminData.password,
        role: newAdminData.role
      });
      
      // Refresh the admins list
      const updatedAdmins = await SupabaseService.getAllAdmins();
      setAdmins(updatedAdmins);
      
      // Reset form and close dialog
      setNewAdminData({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'admin'
      });
      setIsAddAdminOpen(false);
    } catch (err) {
      console.error('Error adding admin:', err);
      setError(err instanceof Error ? err.message : 'Failed to add admin');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAdmin = async () => {
    if (!selectedAdmin) return;
    
    try {
      setLoading(true);
      await SupabaseService.updateAdmin(selectedAdmin.id, {
        first_name: editAdminData.first_name,
        last_name: editAdminData.last_name,
        email: editAdminData.email,
        role: editAdminData.role
      });
      
      // Refresh the admins list
      const updatedAdmins = await SupabaseService.getAllAdmins();
      setAdmins(updatedAdmins);
      
      // Close dialog
      setIsEditAdminOpen(false);
    } catch (err) {
      console.error('Error updating admin:', err);
      setError(err instanceof Error ? err.message : 'Failed to update admin');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedAdmin) return;
    
    if (passwordData.password !== passwordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      setLoading(true);
      await SupabaseService.updateAdminPassword(selectedAdmin.id, passwordData.password);
      
      // Reset form and close dialog
      setPasswordData({
        password: '',
        confirmPassword: ''
      });
      setIsChangePasswordOpen(false);
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm('Are you sure you want to delete this admin? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      await SupabaseService.deleteAdmin(adminId);
      
      // Refresh the admins list
      const updatedAdmins = await SupabaseService.getAllAdmins();
      setAdmins(updatedAdmins);
    } catch (err) {
      console.error('Error deleting admin:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete admin');
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

  const isSysAdmin = currentAdmin?.role === 'sysAdmin';

  if (loading && admins.length === 0) {
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
          <h1 className="text-2xl font-bold">Admin Management</h1>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search admins..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {isSysAdmin && (
              <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Admin
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Admin</DialogTitle>
                    <DialogDescription>
                      Create a new admin user with appropriate permissions.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={newAdminData.first_name}
                          onChange={(e) => setNewAdminData({...newAdminData, first_name: e.target.value})}
                          placeholder="John"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={newAdminData.last_name}
                          onChange={(e) => setNewAdminData({...newAdminData, last_name: e.target.value})}
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newAdminData.email}
                        onChange={(e) => setNewAdminData({...newAdminData, email: e.target.value})}
                        placeholder="john.doe@example.com"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newAdminData.password}
                        onChange={(e) => setNewAdminData({...newAdminData, password: e.target.value})}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={newAdminData.role}
                        onValueChange={(value: 'admin' | 'sysAdmin') => setNewAdminData({...newAdminData, role: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="sysAdmin">System Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddAdminOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddAdmin} disabled={loading}>
                      {loading ? 'Creating...' : 'Create Admin'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {!isSysAdmin && (
          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Limited Access</AlertTitle>
            <AlertDescription>
              You have limited access to admin management. Only system administrators can create, edit, or delete admin accounts.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Admins List */}
        <Card className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdmins.length > 0 ? (
                filteredAdmins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">
                      {admin.first_name} {admin.last_name}
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {admin.role === 'sysAdmin' ? (
                          <ShieldAlert className="h-4 w-4 mr-2 text-red-500" />
                        ) : (
                          <Shield className="h-4 w-4 mr-2 text-blue-500" />
                        )}
                        {admin.role === 'sysAdmin' ? 'System Admin' : 'Admin'}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(admin.created_at)}</TableCell>
                    <TableCell className="text-right">
                      {isSysAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <span className="sr-only">Open menu</span>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Dialog open={isEditAdminOpen && selectedAdmin?.id === admin.id}
                                    onOpenChange={(open) => {
                                      setIsEditAdminOpen(open);
                                      if (!open) setSelectedAdmin(null);
                                    }}>
                              <DialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => {
                                  e.preventDefault();
                                  setSelectedAdmin(admin);
                                  setEditAdminData({
                                    first_name: admin.first_name,
                                    last_name: admin.last_name,
                                    email: admin.email,
                                    role: admin.role
                                  });
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Admin
                                </DropdownMenuItem>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Edit Admin</DialogTitle>
                                  <DialogDescription>
                                    Update admin information and role.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                      <Label htmlFor="editFirstName">First Name</Label>
                                      <Input
                                        id="editFirstName"
                                        value={editAdminData.first_name}
                                        onChange={(e) => setEditAdminData({...editAdminData, first_name: e.target.value})}
                                      />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      <Label htmlFor="editLastName">Last Name</Label>
                                      <Input
                                        id="editLastName"
                                        value={editAdminData.last_name}
                                        onChange={(e) => setEditAdminData({...editAdminData, last_name: e.target.value})}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Label htmlFor="editEmail">Email</Label>
                                    <Input
                                      id="editEmail"
                                      type="email"
                                      value={editAdminData.email}
                                      onChange={(e) => setEditAdminData({...editAdminData, email: e.target.value})}
                                    />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Label htmlFor="editRole">Role</Label>
                                    <Select
                                      value={editAdminData.role}
                                      onValueChange={(value: 'admin' | 'sysAdmin') => 
                                        setEditAdminData({...editAdminData, role: value})
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="sysAdmin">System Admin</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setIsEditAdminOpen(false)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={handleUpdateAdmin} disabled={loading}>
                                    {loading ? 'Updating...' : 'Update Admin'}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            
                            <Dialog open={isChangePasswordOpen && selectedAdmin?.id === admin.id}
                                    onOpenChange={(open) => {
                                      setIsChangePasswordOpen(open);
                                      if (!open) setSelectedAdmin(null);
                                    }}>
                              <DialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => {
                                  e.preventDefault();
                                  setSelectedAdmin(admin);
                                  setPasswordData({
                                    password: '',
                                    confirmPassword: ''
                                  });
                                }}>
                                  <Key className="h-4 w-4 mr-2" />
                                  Change Password
                                </DropdownMenuItem>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Change Password</DialogTitle>
                                  <DialogDescription>
                                    Set a new password for {admin.first_name} {admin.last_name}.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="flex flex-col gap-2">
                                    <Label htmlFor="newPassword">New Password</Label>
                                    <Input
                                      id="newPassword"
                                      type="password"
                                      value={passwordData.password}
                                      onChange={(e) => setPasswordData({...passwordData, password: e.target.value})}
                                      placeholder="••••••••"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <Input
                                      id="confirmPassword"
                                      type="password"
                                      value={passwordData.confirmPassword}
                                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                      placeholder="••••••••"
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setIsChangePasswordOpen(false)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={handleChangePassword} disabled={loading}>
                                    {loading ? 'Updating...' : 'Change Password'}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            
                            {/* Don't allow deleting your own account */}
                            {currentAdmin?.id !== admin.id && (
                              <DropdownMenuItem onSelect={(e) => {
                                e.preventDefault();
                                handleDeleteAdmin(admin.id);
                              }}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    <User className="h-8 w-8 mx-auto text-gray-400" />
                    <p className="mt-2 text-gray-500">
                      {searchTerm ? 'No admins match your search' : 'No admins found'}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AdminLayout>
  );
}
