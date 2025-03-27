"use client"

import { useState, useEffect } from "react"
import { 
  UserPlus, 
  X, 
  Loader2, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Copy, 
  Mail 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import { SupabaseService } from "@/services/supabaseService"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { 
  Card,
  CardContent
} from "@/components/ui/card"
import { generatePassword } from "@/lib/utils"

interface AddFamilyMemberModalProps {
  onMemberAdded?: () => void;
  className?: string;
  buttonLabel?: string;
  isAdmin?: boolean;
  familyId?: string;
}

type Step = 'personal' | 'role' | 'confirmation';

export function AddFamilyMemberModal({ 
  onMemberAdded, 
  className, 
  buttonLabel = "Add Family Member",
  isAdmin = false,
  familyId
}: AddFamilyMemberModalProps) {
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState<Step>('personal')
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'Father' as 'Father' | 'Mother' | 'Grandfather' | 'Grandmother' | 'Older Brother' | 'Older Sister' | 'Middle Brother' | 'Middle Sister' | 'Youngest Brother' | 'Youngest Sister',
    persona: 'Children' as 'Parent' | 'Children',
    status: 'Active' as 'Active' | 'Validating' | 'Not Active',
    bio: '',
    phone_number: ''
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [emailCopied, setEmailCopied] = useState(false)
  const [currentUserFamilyId, setCurrentUserFamilyId] = useState<string | null>(null)

  // Fetch current user's family_id when the modal opens
  useEffect(() => {
    if (open && !isAdmin) {
      const fetchCurrentUserFamilyId = async () => {
        try {
          const userEmail = sessionStorage.getItem('userEmail');
          if (userEmail) {
            const user = await SupabaseService.getUserByEmail(userEmail);
            if (user && user.family_id) {
              setCurrentUserFamilyId(user.family_id);
            }
          }
        } catch (error) {
          console.error('Error fetching user family ID:', error);
        }
      };
      
      fetchCurrentUserFamilyId();
    }
  }, [open, isAdmin]);

  // Generate password when the form opens
  useEffect(() => {
    if (open) {
      const generatedPassword = generatePassword(10);
      setFormData(prev => ({
        ...prev,
        password: generatedPassword
      }));
    }
  }, [open]);

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

  // Handle role selection
  const handleRoleSelect = (role: 'Father' | 'Mother' | 'Grandfather' | 'Grandmother' | 'Older Brother' | 'Older Sister' | 'Middle Brother' | 'Middle Sister' | 'Youngest Brother' | 'Youngest Sister') => {
    setFormData(prev => ({
      ...prev,
      role
    }))
    
    // Clear role error if it exists
    if (formErrors.role) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.role
        return newErrors
      })
    }
  }

  // Validate current step
  const validateStep = () => {
    const errors: Record<string, string> = {};
    
    if (currentStep === 'personal') {
      if (!formData.first_name.trim()) errors.first_name = "First name is required";
      if (!formData.last_name.trim()) errors.last_name = "Last name is required";
      if (!formData.phone_number.trim()) errors.phone_number = "Phone number is required";
    } 
    else if (currentStep === 'role') {
      if (!formData.role) errors.role = "Role is required";
      if (!formData.email.trim()) errors.email = "Email is required";
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (formData.email && !emailRegex.test(formData.email)) {
        errors.email = "Please enter a valid email address";
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // Handle next step
  const handleNextStep = () => {
    if (!validateStep()) return;
    
    if (currentStep === 'personal') {
      setCurrentStep('role');
    } else if (currentStep === 'role') {
      setCurrentStep('confirmation');
    }
  }

  // Handle previous step
  const handlePreviousStep = () => {
    if (currentStep === 'role') {
      setCurrentStep('personal');
    } else if (currentStep === 'confirmation') {
      setCurrentStep('role');
    }
  }

  // Handle form submission
  const handleSubmit = async () => {
    setFormSuccess(null);
    
    try {
      setIsSubmitting(true);
      
      if (isAdmin) {
        // Admin-specific logic if needed
        await SupabaseService.addMemberToFamily(
          familyId || formData.last_name, // Use familyId if provided, otherwise use last name
          {
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            password: formData.password,
            role: formData.role,
            persona: formData.persona,
            status: formData.status
          }
        );
      } else {
        // For regular users, simply use addFamilyMember which handles family creation if needed
        await SupabaseService.addFamilyMember({
          ...formData,
          family_id: currentUserFamilyId || undefined
        });
      }
      
      setFormSuccess("Family member added successfully!");
      
      // Keep the dialog open to show the success message and credentials
      setTimeout(() => {
        if (onMemberAdded) {
          onMemberAdded();
        }
      }, 500);
      
    } catch (err) {
      setFormErrors({
        form: err instanceof Error ? err.message : 'Failed to add family member'
      });
      setCurrentStep('personal'); // Go back to first step on error
    } finally {
      setIsSubmitting(false);
    }
  }

  // Copy to clipboard
  const copyToClipboard = (text: string, type: 'email' | 'password') => {
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    } else {
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
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
      password: generatePassword(10),
      role: 'Father' as 'Father' | 'Mother' | 'Grandfather' | 'Grandmother' | 'Older Brother' | 'Older Sister' | 'Middle Brother' | 'Middle Sister' | 'Youngest Brother' | 'Youngest Sister',
      persona: 'Children',
      status: 'Active',
      bio: '',
      phone_number: ''
    });
    setFormErrors({});
    setFormSuccess(null);
    setCurrentStep('personal');
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      resetForm();
    }
    setOpen(newOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className={className}>
          <UserPlus className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white border border-gray-200 shadow-lg rounded-xl p-0 overflow-hidden" style={{ backdropFilter: 'none' }}>
        <Card className="border-0 shadow-none">
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <DialogTitle className="text-xl font-semibold">
                  {formSuccess ? "Family Member Added" : "Add Family Member"}
                </DialogTitle>
              </div>
              
              {formErrors.form && (
                <Alert variant="destructive" className="mb-4 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formErrors.form}</AlertDescription>
                </Alert>
              )}
              
              {formSuccess ? (
                <div className="space-y-4">
                  <Alert variant="default" className="bg-green-50 border-green-200 rounded-lg">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">{formSuccess}</AlertDescription>
                  </Alert>
                  
                  <Card className="rounded-lg border border-gray-200 shadow-sm">
                    <CardContent className="pt-6 space-y-4">
                      <h3 className="font-medium text-center">Login Credentials</h3>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <div className="flex">
                          <Input 
                            value={formData.email} 
                            readOnly 
                            className="flex-1 rounded-l-lg rounded-r-none border-r-0"
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="rounded-l-none rounded-r-lg px-3"
                            onClick={() => copyToClipboard(formData.email, 'email')}
                          >
                            {emailCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <div className="flex">
                          <Input 
                            value={formData.password} 
                            readOnly 
                            className="flex-1 rounded-l-lg rounded-r-none border-r-0"
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="rounded-l-none rounded-r-lg px-3"
                            onClick={() => copyToClipboard(formData.password, 'password')}
                          >
                            {passwordCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <Button 
                          className="w-full rounded-lg"
                          onClick={() => {
                            setOpen(false);
                            resetForm();
                          }}
                        >
                          Close
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Step indicator */}
                  <div className="flex justify-between mb-6">
                    <div className={`flex-1 h-1 rounded-full ${currentStep === 'personal' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                    <div className="mx-1"></div>
                    <div className={`flex-1 h-1 rounded-full ${currentStep === 'role' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                    <div className="mx-1"></div>
                    <div className={`flex-1 h-1 rounded-full ${currentStep === 'confirmation' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  </div>
                  
                  {/* Step 1: Personal Information */}
                  {currentStep === 'personal' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="first_name" className={cn(formErrors.first_name && "text-red-500")}>
                            First Name*
                          </Label>
                          <Input
                            id="first_name"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleInputChange}
                            className={cn(formErrors.first_name && "border-red-300 focus-visible:ring-red-500", "rounded-lg")}
                          />
                          {formErrors.first_name && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.first_name}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="last_name" className={cn(formErrors.last_name && "text-red-500")}>
                            Last Name*
                          </Label>
                          <Input
                            id="last_name"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleInputChange}
                            className={cn(formErrors.last_name && "border-red-300 focus-visible:ring-red-500", "rounded-lg")}
                          />
                          {formErrors.last_name && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.last_name}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone_number" className={cn(formErrors.phone_number && "text-red-500")}>
                          Phone Number*
                        </Label>
                        <Input
                          id="phone_number"
                          name="phone_number"
                          value={formData.phone_number}
                          onChange={handleInputChange}
                          placeholder="+1 (555) 123-4567"
                          className={cn(formErrors.phone_number && "border-red-300 focus-visible:ring-red-500", "rounded-lg")}
                        />
                        {formErrors.phone_number && (
                          <p className="text-xs text-red-500 mt-1">{formErrors.phone_number}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio (Optional)</Label>
                        <Textarea
                          id="bio"
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          placeholder="A short description about this family member"
                          className="min-h-[80px] rounded-lg"
                        />
                      </div>
                      
                      <div className="flex justify-end pt-2">
                        <Button 
                          onClick={handleNextStep}
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                          Next
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Step 2: Role Information */}
                  {currentStep === 'role' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className={cn(formErrors.email && "text-red-500")}>
                          Email Address*
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="example@email.com"
                          className={cn(formErrors.email && "border-red-300 focus-visible:ring-red-500", "rounded-lg")}
                        />
                        {formErrors.email && (
                          <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="role" className={cn(formErrors.role && "text-red-500")}>
                          Role in Family*
                        </Label>
                        <select
                          id="role"
                          name="role"
                          value={formData.role}
                          onChange={(e) => handleRoleSelect(e.target.value as 'Father' | 'Mother' | 'Grandfather' | 'Grandmother' | 'Older Brother' | 'Older Sister' | 'Middle Brother' | 'Middle Sister' | 'Youngest Brother' | 'Youngest Sister')}
                          className={cn(
                            "w-full rounded-lg border border-input bg-background px-3 py-2",
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
                        <Label htmlFor="persona">Persona Type</Label>
                        <select
                          id="persona"
                          name="persona"
                          value={formData.persona}
                          onChange={(e) => handleSelectChange('persona', e.target.value as 'Parent' | 'Children')}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2"
                        >
                          <option value="Parent">Parent</option>
                          <option value="Children">Children</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="status">Account Status</Label>
                        <select
                          id="status"
                          name="status"
                          value={formData.status}
                          onChange={(e) => handleSelectChange('status', e.target.value as 'Active' | 'Validating' | 'Not Active')}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2"
                        >
                          <option value="Active">Active</option>
                          <option value="Validating">Validating</option>
                          <option value="Not Active">Not Active</option>
                        </select>
                      </div>
                      
                      <div className="flex justify-between pt-2">
                        <Button 
                          variant="outline"
                          onClick={handlePreviousStep}
                          className="rounded-lg"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                        </Button>
                        <Button 
                          onClick={handleNextStep}
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                          Next
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Step 3: Confirmation */}
                  {currentStep === 'confirmation' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-sm text-gray-500">First Name</p>
                            <p className="font-medium">{formData.first_name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Last Name</p>
                            <p className="font-medium">{formData.last_name}</p>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium">{formData.email}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Role</p>
                          <p className="font-medium">{formData.role}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Phone Number</p>
                          <p className="font-medium">{formData.phone_number}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Persona</p>
                          <p className="font-medium">{formData.persona}</p>
                        </div>
                        
                        {formData.bio && (
                          <div>
                            <p className="text-sm text-gray-500">Bio</p>
                            <p className="font-medium">{formData.bio}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                        <div className="flex items-center mb-2">
                          <Mail className="h-4 w-4 text-blue-600 mr-2" />
                          <h3 className="font-medium text-blue-800">Auto-generated Password</h3>
                        </div>
                        <p className="text-sm text-blue-700 mb-3">
                          The following password will be created for this family member:
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Password:</span>
                            <span className="text-sm">{formData.password}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between pt-2">
                        <Button 
                          variant="outline"
                          onClick={handlePreviousStep}
                          className="rounded-lg"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                        </Button>
                        <Button 
                          onClick={handleSubmit}
                          disabled={isSubmitting}
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
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
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
