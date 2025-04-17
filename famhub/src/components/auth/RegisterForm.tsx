'use client';

import { useState } from 'react';
import { UserService } from '../../services/userService';
import { FamilyService } from '../../services/familyService';
import { User } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import bcrypt from 'bcryptjs';
import { useSession } from '@/hooks/useSession';
import { SupabaseService } from '@/services/supabaseService';
import { toast } from 'sonner';

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  persona: 'Parent' | 'Children';
  createFamily: boolean;
  familyName: string;
  familyCode: string;
}

export default function RegisterForm() {
  const router = useRouter();
  const { setUserEmail } = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Father',
    persona: 'Parent',
    createFamily: true,
    familyName: '',
    familyCode: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({
        ...formData,
        [name]: checked,
        // If creating a family, clear the family code; if joining, clear the family name
        familyCode: name === 'createFamily' && checked ? '' : formData.familyCode,
        familyName: name === 'createFamily' && !checked ? '' : formData.familyName
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      // Form validation
      const validationErrors: Record<string, string> = {};
      
      if (formData.password !== formData.confirmPassword) {
        validationErrors.confirmPassword = 'Passwords do not match';
      }
      
      if (formData.createFamily && !formData.familyName.trim()) {
        validationErrors.familyName = 'Family name is required';
      }
      
      if (!formData.createFamily && !formData.familyCode.trim()) {
        validationErrors.familyCode = 'Family code is required';
      }
      
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setLoading(false);
        return;
      }

      // Register user first (without family_id if creating a new family)
      const userId = await UserService.registerUser({
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: formData.role,
        persona: formData.persona,
        bio: '',
        phone_number: '',
        family_id: formData.createFamily ? undefined : formData.familyCode
      });
      
      // If creating a family, create it now and link the user to it
      if (formData.createFamily && formData.familyName) {
        await FamilyService.createFamily(formData.familyName, userId, formData.email);
      }
      
      // Store user email in sessionStorage for session management
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('userEmail', formData.email);
        setUserEmail(formData.email);
      }
      
      // Show success message and redirect to login page
      toast.success('Registration successful! Please log in to continue.');
      router.push('/login');
    } catch (err: any) {
      console.error('Registration error:', err);
      toast.error(err.message || 'Registration failed');
      setErrors({ general: err.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const familyRoles = ['Father', 'Mother', 'Grandfather', 'Grandmother', 'Older Brother', 'Older Sister', 'Middle Brother', 'Middle Sister', 'Youngest Brother', 'Youngest Sister'];
  const personaTypes = ['Parent', 'Children'];

  return (
    <div className="w-full max-w-3xl mx-auto bg-[#1a1d24] rounded-lg overflow-hidden shadow-lg flex flex-col md:flex-row">
      {/* Image Section - Left side on desktop, top on mobile */}
      <div className="relative w-full md:w-2/5 h-48 md:h-auto">
        <Image 
          src="/family.jpg" 
          alt="Registration" 
          fill 
          className="object-cover" 
          priority 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#121418]/70 to-transparent"></div>
        <div className="absolute bottom-4 left-4 text-white">
          <h2 className="text-xl font-bold">Join Our Community</h2>
          <p className="text-sm text-gray-300 mt-1">Connect with families and support groups</p>
        </div>
      </div>

      {/* Form Section - Right side on desktop, bottom on mobile */}
      <div className="w-full md:w-3/5 p-6 md:p-8">
        <h1 className="text-xl font-semibold text-white mb-6">Create an Account</h1>
        
        {errors.general && (
          <div className="mb-5 p-2 bg-red-500/20 border border-red-500 rounded text-red-500 text-sm">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-3">
              <Label htmlFor="firstName" className="text-sm text-white font-medium block mb-1.5">
                First Name
              </Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="Enter first name"
                value={formData.firstName}
                onChange={handleChange}
                required
                className={`bg-[#2a2d35] border-gray-700 text-white h-11 ${errors.firstName ? 'border-red-500' : ''}`}
                disabled={loading}
              />
              {errors.firstName && (
                <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>
              )}
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="lastName" className="text-sm text-white font-medium block mb-1.5">
                Last Name
              </Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Enter last name"
                value={formData.lastName}
                onChange={handleChange}
                required
                className={`bg-[#2a2d35] border-gray-700 text-white h-11 ${errors.lastName ? 'border-red-500' : ''}`}
                disabled={loading}
              />
              {errors.lastName && (
                <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-3 mt-1">
            <Label htmlFor="email" className="text-sm text-white font-medium block mb-1.5">
              Email Address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              className={`bg-[#2a2d35] border-gray-700 text-white h-11 ${errors.email ? 'border-red-500' : ''}`}
              disabled={loading}
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          <div className="space-y-3 mt-1">
            <Label htmlFor="password" className="text-sm text-white font-medium block mb-1.5">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                required
                className={`bg-[#2a2d35] border-gray-700 text-white pr-10 h-11 ${errors.password ? 'border-red-500' : ''}`}
                disabled={loading}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-3 text-gray-400 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password}</p>
            )}
          </div>

          <div className="space-y-3 mt-1">
            <Label htmlFor="confirmPassword" className="text-sm text-white font-medium block mb-1.5">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className={`bg-[#2a2d35] border-gray-700 text-white pr-10 h-11 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                disabled={loading}
              />
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className="absolute right-3 top-3 text-gray-400 hover:text-white"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="space-y-3 mt-1">
            <Label htmlFor="role" className="text-sm text-white font-medium block mb-1.5">
              Family Role
            </Label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className={`w-full bg-[#2a2d35] border-gray-700 text-white h-11 rounded-md px-3 ${errors.role ? 'border-red-500' : ''}`}
              disabled={loading}
            >
              <option value="">Select Family Role</option>
              {familyRoles.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="text-xs text-red-500 mt-1">{errors.role}</p>
            )}
          </div>

          <div className="space-y-3 mt-1">
            <Label htmlFor="persona" className="text-sm text-white font-medium block mb-1.5">
              Persona
            </Label>
            <select
              id="persona"
              name="persona"
              value={formData.persona}
              onChange={handleChange}
              required
              className={`w-full bg-[#2a2d35] border-gray-700 text-white h-11 rounded-md px-3 ${errors.persona ? 'border-red-500' : ''}`}
              disabled={loading}
            >
              <option value="">Select Persona</option>
              {personaTypes.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.persona && (
              <p className="text-xs text-red-500 mt-1">{errors.persona}</p>
            )}
          </div>

          <div className="space-y-3 mt-2">
            <div className="flex items-center pt-1.5">
              <input
                type="checkbox"
                id="createFamily"
                name="createFamily"
                checked={formData.createFamily}
                onChange={handleChange}
                className="mr-3 h-5 w-5 bg-[#2a2d35] border-gray-700 text-blue-600 rounded"
                disabled={loading}
              />
              <Label htmlFor="createFamily" className="text-sm text-white cursor-pointer font-medium">
                Create Family
              </Label>
            </div>
          </div>

          {formData.createFamily ? (
            <div className="space-y-3 mt-1">
              <Label htmlFor="familyName" className="text-sm text-white font-medium block mb-1.5">
                Family Name
              </Label>
              <Input
                id="familyName"
                name="familyName"
                placeholder="Enter family name"
                value={formData.familyName}
                onChange={handleChange}
                required
                className={`bg-[#2a2d35] border-gray-700 text-white h-11 ${errors.familyName ? 'border-red-500' : ''}`}
                disabled={loading}
              />
              {errors.familyName && (
                <p className="text-xs text-red-500 mt-1">{errors.familyName}</p>
              )}
            </div>
          ) : (
            <div className="space-y-3 mt-1">
              <Label htmlFor="familyCode" className="text-sm text-white font-medium block mb-1.5">
                Family Code
              </Label>
              <Input
                id="familyCode"
                name="familyCode"
                placeholder="Enter family code"
                value={formData.familyCode}
                onChange={handleChange}
                required
                className={`bg-[#2a2d35] border-gray-700 text-white h-11 ${errors.familyCode ? 'border-red-500' : ''}`}
                disabled={loading}
              />
              {errors.familyCode && (
                <p className="text-xs text-red-500 mt-1">{errors.familyCode}</p>
              )}
            </div>
          )}

          <div className="pt-5 mt-3">
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Register'
              )}
            </Button>
          </div>

          <p className="text-center text-sm text-gray-400 mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-500 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
