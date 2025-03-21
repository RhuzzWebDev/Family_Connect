"use client"

import { useState } from "react"
import { Plus, Loader2, Check, AlertCircle, UserPlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SupabaseService } from "@/services/supabaseService"
import { cn } from "@/lib/utils"

interface AddFamilyMemberProps {
  onMemberAdded?: () => void;
  className?: string;
}

export function AddFamilyMember({ onMemberAdded, className }: AddFamilyMemberProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("personal")
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: '',
    persona: 'Children' as 'Parent' | 'Children',
    status: 'Active' as 'Active' | 'Validating' | 'Not Active',
    bio: '',
    phone_number: ''
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error for this field when user types
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error for this field when user selects
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.first_name.trim()) errors.first_name = "First name is required"
    if (!formData.last_name.trim()) errors.last_name = "Last name is required"
    
    if (!formData.email.trim()) {
      errors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email is invalid"
    }
    
    if (!formData.password.trim()) {
      errors.password = "Password is required"
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters"
    }
    
    if (!formData.role) errors.role = "Role is required"
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormSuccess(null)
    
    if (!validateForm()) {
      return
    }
    
    try {
      setIsSubmitting(true)
      await SupabaseService.addFamilyMember(formData)
      
      setFormSuccess("Family member added successfully!")
      
      // Reset form after a short delay to show success message
      setTimeout(() => {
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          password: '',
          role: '',
          persona: 'Children',
          status: 'Active',
          bio: '',
          phone_number: ''
        })
        
        setIsOpen(false)
        setFormSuccess(null)
        setActiveTab("personal")
        
        // Notify parent component
        if (onMemberAdded) {
          onMemberAdded()
        }
      }, 1500)
      
    } catch (err) {
      setFormErrors({
        form: err instanceof Error ? err.message : 'Failed to add family member'
      })
    } finally {
      setIsSubmitting(false)
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

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role: '',
      persona: 'Children',
      status: 'Active',
      bio: '',
      phone_number: ''
    })
    setFormErrors({})
    setFormSuccess(null)
    setActiveTab("personal")
  }

  return (
    <>
      <Button 
        onClick={() => {
          resetForm()
          setIsOpen(true)
        }} 
        className={className}
      >
        <UserPlus className="mr-2 h-4 w-4" />
        Add Family Member
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">Add Family Member</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
                Add a new member to your family. They will be able to log in using the provided email and password.
              </p>
              
              {formSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-start">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-green-800 text-sm">{formSuccess}</p>
                </div>
              )}
              
              {formErrors.form && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-red-800 text-sm">{formErrors.form}</p>
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="personal">Personal Details</TabsTrigger>
                    <TabsTrigger value="account">Account Settings</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="personal" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name" className={cn(formErrors.first_name && "text-red-500")}>
                          First Name
                        </Label>
                        <Input
                          id="first_name"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleInputChange}
                          className={cn(formErrors.first_name && "border-red-300 focus-visible:ring-red-500")}
                        />
                        {formErrors.first_name && (
                          <p className="text-xs text-red-500 mt-1">{formErrors.first_name}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name" className={cn(formErrors.last_name && "text-red-500")}>
                          Last Name
                        </Label>
                        <Input
                          id="last_name"
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleInputChange}
                          className={cn(formErrors.last_name && "border-red-300 focus-visible:ring-red-500")}
                        />
                        {formErrors.last_name && (
                          <p className="text-xs text-red-500 mt-1">{formErrors.last_name}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="role" className={cn(formErrors.role && "text-red-500")}>
                        Role in Family
                      </Label>
                      <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={(e) => handleSelectChange('role', e.target.value)}
                        className={cn(
                          "w-full rounded-md border border-input bg-background px-3 py-2",
                          formErrors.role && "border-red-300 focus-visible:ring-red-500"
                        )}
                      >
                        <option value="">Select a role</option>
                        {roleOptions.map(role => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                      {formErrors.role && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.role}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone_number">Phone Number</Label>
                      <Input
                        id="phone_number"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleInputChange}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <textarea
                        id="bio"
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        placeholder="A short description about this family member"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[80px]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="persona">Persona Type</Label>
                      <select
                        id="persona"
                        name="persona"
                        value={formData.persona}
                        onChange={(e) => handleSelectChange('persona', e.target.value as 'Parent' | 'Children')}
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                      >
                        <option value="Parent">Parent</option>
                        <option value="Children">Children</option>
                      </select>
                    </div>
                    
                    <div className="flex justify-end pt-2">
                      <Button 
                        type="button" 
                        onClick={() => setActiveTab("account")}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Next
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="account" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className={cn(formErrors.email && "text-red-500")}>
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={cn(formErrors.email && "border-red-300 focus-visible:ring-red-500")}
                      />
                      {formErrors.email && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password" className={cn(formErrors.password && "text-red-500")}>
                        Password
                      </Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={cn(formErrors.password && "border-red-300 focus-visible:ring-red-500")}
                      />
                      {formErrors.password && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>
                      )}
                      {!formErrors.password && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Password must be at least 6 characters long
                        </p>
                      )}
                    </div>
                    
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-md mt-2">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">Note:</span> This family member will need to use these credentials to log in. 
                        Their account status will be set to "Active" and they can immediately access the platform.
                      </p>
                    </div>
                    
                    <div className="flex justify-between pt-4">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setActiveTab("personal")}
                      >
                        Back
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          "Add Member"
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
