'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

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

type UserRole = User['role'];
type UserPersona = User['persona'];

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  persona: UserPersona;
}

export default function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Father',
    persona: 'Parent'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validate form
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // First, create the auth user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: undefined,  // Disable email confirmation
          data: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: formData.role,
            persona: formData.persona,
            status: 'Validating'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Then, create the user profile in our users table using the service role
      const { error: profileError } = await fetch('/api/auth/create-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: authData.user.id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          role: formData.role,
          persona: formData.persona,
          status: 'Validating'
        })
      }).then(res => res.json());

      if (profileError) {
        // If profile creation fails, we should clean up the auth user
        await supabase.auth.signOut();
        throw profileError;
      }

      // Show success message and redirect to login
      alert('Registration successful! Please wait for your account to be validated.');
      router.push('/login');
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({
        email: (error as Error).message || 'Failed to create account'
      });
    } finally {
      setLoading(false);
    }
  };

  const familyRoles = ['Father', 'Mother', 'Son', 'Daughter', 'Grandparent', 'Other'];
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
              name="first_name"
              type="text"
              autoComplete="given-name"
              required
              placeholder="Enter first name"
              value={formData.first_name}
              onChange={handleChange}
              error={errors.first_name}
              disabled={loading}
            />
            <Input
              label="Last Name"
              name="last_name"
              type="text"
              autoComplete="family-name"
              required
              placeholder="Enter last name"
              value={formData.last_name}
              onChange={handleChange}
              error={errors.last_name}
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
