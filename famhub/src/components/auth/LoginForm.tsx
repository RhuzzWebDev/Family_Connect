'use client';

import { useState } from 'react';
import { AirtableService } from '@/services/airtableService';
import { useRouter } from 'next/navigation';
import bcrypt from 'bcryptjs';
import Link from 'next/link';

// Reusable input component with error handling
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

export default function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    Email: '',
    Password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (!formData.Email.trim()) {
      newErrors.Email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Email)) {
      newErrors.Email = 'Invalid email format';
    }
    if (!formData.Password) {
      newErrors.Password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const userService = new AirtableService();
      
      // Find user by email
      const filterFormula = `{Email} = '${formData.Email}'`;
      const users = await userService.getRecords(filterFormula);
      
      if (users.length === 0) {
        throw new Error('Invalid email or password');
      }
      
      const user = users[0];
      const storedPassword = user.fields.Password as string;
      
      // Compare the provided password with the stored hash
      const isPasswordValid = await bcrypt.compare(formData.Password, storedPassword);
      
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }
      
      // Check if user is validated
      if (user.fields.Status === 'Validating') {
        throw new Error('Your account is still pending validation');
      }
      
      // Store user email in sessionStorage for the navbar to use
      sessionStorage.setItem('userEmail', formData.Email);
      
      // Successful login - redirect to home page
      router.push('/');
    } catch (err: any) {
      setErrors({
        submit: err.message || 'Login failed. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 sm:p-8 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <div className="p-4 rounded-lg bg-red-50 text-sm text-red-600">
              {errors.submit}
            </div>
          )}

          <Input
            label="Email"
            name="Email"
            type="email"
            required
            value={formData.Email}
            onChange={handleChange}
            placeholder="Enter your email"
            error={errors.Email}
          />

          <Input
            label="Password"
            name="Password"
            type="password"
            required
            value={formData.Password}
            onChange={handleChange}
            placeholder="Enter your password"
            error={errors.Password}
          />

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-3 px-4
                bg-blue-600 hover:bg-blue-700
                text-white font-medium rounded-lg
                transition duration-200 ease-in-out
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center
              "
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
          
          <div className="text-center mt-4 text-sm">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link href="/register" className="text-blue-600 hover:text-blue-800 font-medium">
                Create an account
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
