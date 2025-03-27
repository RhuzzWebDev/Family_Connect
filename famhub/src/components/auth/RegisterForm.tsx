'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import bcrypt from 'bcryptjs';
import { useSession } from '@/hooks/useSession';
import { SupabaseService } from '@/services/supabaseService';

const Input = ({ 
  label, 
  error, 
  ...props 
}: { 
  label: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <input
      {...props}
      className={`
        w-full px-4 py-2 rounded-lg border
        ${error ? 'border-red-500' : 'border-gray-300'}
        focus:outline-none focus:ring-2
        ${error ? 'focus:ring-red-500' : 'focus:ring-blue-500'}
        focus:border-transparent
        transition duration-200 ease-in-out
        placeholder:text-gray-400
      `}
    />
    {error && (
      <p className="mt-1 text-sm text-red-600">{error}</p>
    )}
  </div>
);

const SelectInput = ({
  label,
  error,
  options,
  ...props
}: {
  label: string;
  error?: string;
  options: string[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <select
      {...props}
      className={`
        w-full px-4 py-2 rounded-lg border
        ${error ? 'border-red-500' : 'border-gray-300'}
        focus:outline-none focus:ring-2
        ${error ? 'focus:ring-red-500' : 'focus:ring-blue-500'}
        focus:border-transparent
        transition duration-200 ease-in-out
        bg-white
      `}
    >
      <option value="">Select {label}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
    {error && (
      <p className="mt-1 text-sm text-red-600">{error}</p>
    )}
  </div>
);

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
    const newErrors: Record<string, string> = {};

    // Validate form
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }
    if (!formData.persona) {
      newErrors.persona = 'Persona is required';
    }
    if (!formData.createFamily && !formData.familyCode.trim()) {
      newErrors.familyCode = 'Family code is required to join an existing family';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', formData.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(checkError.message);
      }

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(formData.password, 10);

      let familyId: string | null = null;

      if (formData.createFamily) {
        // Create a new family based on last name
        const { data: newFamily, error: familyError } = await supabase
          .rpc('get_or_create_family', { 
            p_family_name: formData.lastName,
            p_user_id: null // Will be updated after user creation
          });

        if (familyError || !newFamily) {
          throw new Error('Failed to create family. Please try again.');
        }

        familyId = newFamily;
      } else {
        // Verify family code (which is actually a family ID)
        const { data: existingFamily, error: familyError } = await supabase
          .from('families')
          .select('id')
          .eq('id', formData.familyCode)
          .single();

        if (familyError || !existingFamily) {
          throw new Error('Invalid family code. Please check and try again.');
        }

        familyId = existingFamily.id;
      }

      // Create user in the users table
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          password: hashedPassword,
          role: formData.role,
          persona: formData.persona,
          status: 'Validating',
          family_id: familyId
        })
        .select()
        .single();

      if (createError) {
        throw new Error(createError.message);
      }

      // If this is a new family and the user is the first member, update the created_by field
      if (formData.createFamily) {
        await supabase
          .from('families')
          .update({ created_by: newUser.id })
          .eq('id', familyId);
          
        // Create default questions for the new family
        try {
          await SupabaseService.createDefaultQuestions(newUser.id);
          console.log('Default questions created successfully');
        } catch (error) {
          console.error('Error creating default questions:', error);
          // Continue even if creating default questions fails
        }
      }

      // Store email using the session hook
      setUserEmail(formData.email);

      // Show success message and redirect to login
      alert('Registration successful! Please wait for your account to be validated.');
      router.push('/login');
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({
        email: error instanceof Error ? error.message : 'An unexpected error occurred during registration'
      });
    } finally {
      setLoading(false);
    }
  };

  const familyRoles = ['Father', 'Mother', 'Grandfather', 'Grandmother', 'Older Brother', 'Older Sister', 'Middle Brother', 'Middle Sister', 'Youngest Brother', 'Youngest Sister'];
  const personaTypes = ['Parent', 'Children'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              placeholder="Enter first name"
              value={formData.firstName}
              onChange={handleChange}
              error={errors.firstName}
              disabled={loading}
            />
            <Input
              label="Last Name"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              placeholder="Enter last name"
              value={formData.lastName}
              onChange={handleChange}
              error={errors.lastName}
              disabled={loading}
            />
          </div>
          <Input
            label="Email Address"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            disabled={loading}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Create a password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            disabled={loading}
          />
          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            disabled={loading}
          />
          <SelectInput
            label="Family Role"
            name="role"
            required
            value={formData.role}
            onChange={handleChange}
            error={errors.role}
            options={familyRoles}
            disabled={loading}
          />
          <SelectInput
            label="Persona"
            name="persona"
            required
            value={formData.persona}
            onChange={handleChange}
            error={errors.persona}
            options={personaTypes}
            disabled={loading}
          />
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Create Family
            </label>
            <input
              type="checkbox"
              name="createFamily"
              checked={formData.createFamily}
              onChange={handleChange}
              className="mr-2"
            />
            {!formData.createFamily && (
              <Input
                label="Family Code"
                name="familyCode"
                type="text"
                required
                placeholder="Enter family code"
                value={formData.familyCode}
                onChange={handleChange}
                error={errors.familyCode}
                disabled={loading}
              />
            )}
          </div>
          <div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </div>
          <div className="text-sm text-center">
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
