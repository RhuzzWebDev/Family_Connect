"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Mail, Phone, Video, Loader2, CheckCircle, Clock, MoreVertical, Pencil, Trash2, X } from "lucide-react"
import { Alert } from "@/components/ui/alert"
import { SupabaseService } from "@/services/supabaseService"
import { User } from "@/lib/supabase"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// Type for family member display
interface FamilyMember extends Omit<User, 'status'> {
  status: 'Active' | 'Validating' | 'Not Active';
  bio?: string;
  phone_number?: string;
}

export function FamilyMembers() {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: '',
    phone_number: '',
    bio: '',
    status: 'Active' as 'Active' | 'Validating' | 'Not Active'
  })
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<FamilyMember | null>(null)

  // Fetch family members
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const currentUserData = await SupabaseService.getCurrentUser()
        setCurrentUser(currentUserData)
        
        const familyData = await SupabaseService.getFamilyMembers()
        
        // Transform to FamilyMember type with status
        const transformedData = familyData.map(member => ({
          ...member,
          bio: member.bio || `Family member with role: ${member.role}`,
          phone_number: member.phone_number || `+1 (555) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`
        })) as FamilyMember[]
        
        setMembers(transformedData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load family members')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleEditClick = (member: FamilyMember) => {
    setEditingMember(member)
    setEditFormData({
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      role: member.role,
      phone_number: member.phone_number || '',
      bio: member.bio || '',
      status: member.status
    })
    setEditFormErrors({})
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (member: FamilyMember) => {
    setDeleteConfirmMember(member)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error for this field when user types
    if (editFormErrors[name]) {
      setEditFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateEditForm = () => {
    const errors: Record<string, string> = {}
    
    if (!editFormData.first_name.trim()) errors.first_name = "First name is required"
    if (!editFormData.last_name.trim()) errors.last_name = "Last name is required"
    
    if (!editFormData.email.trim()) {
      errors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(editFormData.email)) {
      errors.email = "Email is invalid"
    }
    
    if (!editFormData.role.trim()) errors.role = "Role is required"
    
    setEditFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateEditForm() || !editingMember) {
      return
    }
    
    try {
      setIsSubmitting(true)
      
      // Update the family member in the database
      await SupabaseService.updateFamilyMember(editingMember.id, editFormData)
      
      // Update the local state
      setMembers(prev => prev.map(member => 
        member.id === editingMember.id 
          ? { ...member, ...editFormData } 
          : member
      ))
      
      setIsEditModalOpen(false)
      setEditingMember(null)
      
    } catch (err) {
      setEditFormErrors({
        form: err instanceof Error ? err.message : 'Failed to update family member'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmMember) return
    
    try {
      // Delete the family member from the database
      await SupabaseService.deleteFamilyMember(deleteConfirmMember.id)
      
      // Update the local state
      setMembers(prev => prev.filter(member => member.id !== deleteConfirmMember.id))
      setDeleteConfirmMember(null)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete family member')
    }
  }

  // Role options
  const roleOptions = [
    { value: 'Father', label: 'Father' },
    { value: 'Mother', label: 'Mother' },
    { value: 'Grandfather', label: 'Grandfather' },
    { value: 'Grandmother', label: 'Grandmother' },
    { value: 'Older Brother', label: 'Older Brother' },
    { value: 'Older Sister', label: 'Older Sister' },
    { value: 'Middle Brother', label: 'Middle Brother' },
    { value: 'Middle Sister', label: 'Middle Sister' },
    { value: 'Youngest Brother', label: 'Youngest Brother' },
    { value: 'Youngest Sister', label: 'Youngest Sister' }
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 col-span-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading family members...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4 col-span-full">
        {error}
      </Alert>
    )
  }

  return (
    <>
      {members.map((member) => (
        <Card 
          key={member.id} 
          className={`overflow-hidden hover:shadow-lg transition-all duration-200 h-full flex flex-col ${
            member.id === currentUser?.id ? 'border-primary border-2' : ''
          }`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 border-2 border-primary/20">
                  <AvatarImage src={`https://api.dicebear.com/7.x/micah/svg?seed=${member.first_name}${member.last_name}`} alt={`${member.first_name} ${member.last_name}`} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {member.first_name[0]}{member.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg font-semibold">{member.first_name} {member.last_name}</CardTitle>
                  <CardDescription className="text-sm font-medium text-primary/70">{member.role}</CardDescription>
                </div>
              </div>
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditClick(member)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteClick(member)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-2 flex-grow">
            <div className="bg-muted/40 p-3 rounded-md">
              <p className="text-sm">{member.bio}</p>
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-primary/60 flex-shrink-0" />
                <span className="truncate">Joined: {new Date(member.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-primary/60 flex-shrink-0" />
                <span className="truncate">{member.phone_number}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-primary/60 flex-shrink-0" />
                <span className="truncate">{member.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {member.status === 'Active' ? (
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                )}
                <span className={`truncate font-medium ${
                  member.status === 'Active' ? 'text-green-700' : 'text-amber-700'
                }`}>
                  Status: {member.status}
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-2 pt-2 border-t bg-muted/20">
            <Button variant="ghost" size="sm" className="flex-1 hover:bg-primary/10 hover:text-primary">
              <Mail className="mr-1 h-4 w-4" />
              Message
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 hover:bg-primary/10 hover:text-primary">
              <Phone className="mr-1 h-4 w-4" />
              Call
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 hover:bg-primary/10 hover:text-primary">
              <Video className="mr-1 h-4 w-4" />
              Video
            </Button>
          </CardFooter>
        </Card>
      ))}

      {/* Edit Member Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">Edit Family Member</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full"
                onClick={() => setIsEditModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4">
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className={cn(editFormErrors.first_name && "text-red-500")}>
                      First Name
                    </Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={editFormData.first_name}
                      onChange={handleInputChange}
                      className={cn(editFormErrors.first_name && "border-red-300 focus-visible:ring-red-500")}
                    />
                    {editFormErrors.first_name && (
                      <p className="text-xs text-red-500 mt-1">{editFormErrors.first_name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className={cn(editFormErrors.last_name && "text-red-500")}>
                      Last Name
                    </Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={editFormData.last_name}
                      onChange={handleInputChange}
                      className={cn(editFormErrors.last_name && "border-red-300 focus-visible:ring-red-500")}
                    />
                    {editFormErrors.last_name && (
                      <p className="text-xs text-red-500 mt-1">{editFormErrors.last_name}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className={cn(editFormErrors.email && "text-red-500")}>
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={editFormData.email}
                    onChange={handleInputChange}
                    className={cn(editFormErrors.email && "border-red-300 focus-visible:ring-red-500")}
                  />
                  {editFormErrors.email && (
                    <p className="text-xs text-red-500 mt-1">{editFormErrors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role" className={cn(editFormErrors.role && "text-red-500")}>
                    Role in Family
                  </Label>
                  <select
                    id="role"
                    name="role"
                    value={editFormData.role}
                    onChange={handleInputChange}
                    className={cn(
                      "w-full rounded-md border border-input bg-background px-3 py-2",
                      editFormErrors.role && "border-red-300 focus-visible:ring-red-500"
                    )}
                  >
                    <option value="">Select a role</option>
                    {roleOptions.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                  {editFormErrors.role && (
                    <p className="text-xs text-red-500 mt-1">{editFormErrors.role}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    value={editFormData.phone_number}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={editFormData.bio}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[80px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Account Status</Label>
                  <select
                    id="status"
                    name="status"
                    value={editFormData.status}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="Active">Active</option>
                    <option value="Validating">Validating</option>
                    <option value="Not Active">Not Active</option>
                  </select>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmMember && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-semibold">Confirm Deletion</h2>
              <p>
                Are you sure you want to delete {deleteConfirmMember.first_name} {deleteConfirmMember.last_name}? 
                This action cannot be undone.
              </p>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setDeleteConfirmMember(null)}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  className="text-white"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
