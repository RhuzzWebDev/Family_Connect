'use client';

import { useState } from 'react';
import { AirtableService, UserFields } from '@/services/airtableService';
import { useRouter } from 'next/navigation';
import bcrypt from 'bcryptjs';
import Link from 'next/link';

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

export default function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    Name: '',
    Email: '',
    Password: '',
    confirmPassword: ''
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

  const hashPassword = async (password: string): Promise<string> => {
    // Generate a salt with 10 rounds
    const salt = await bcrypt.genSalt(10);
    // Hash the password with the salt
    return bcrypt.hash(password, salt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validate form
    if (!formData.Name.trim()) newErrors.Name = 'Name is required';
    if (!formData.Email.trim()) {
      newErrors.Email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Email)) {
      newErrors.Email = 'Invalid email format';
    }
    if (!formData.Password) {
      newErrors.Password = 'Password is required';
    } else if (formData.Password.length < 6) {
      newErrors.Password = 'Password must be at least 6 characters';
    }
    if (formData.Password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const userService = new AirtableService();
      
      // Hash the password before saving
      const hashedPassword = await hashPassword(formData.Password);
      
      const userData: UserFields = {
        Name: formData.Name,
        Email: formData.Email,
        Password: hashedPassword,
        Confirm_Password: hashedPassword, 
        Status: 'Active' // Set to Active for testing purposes
      };
      
      // Create the new record
      await userService.createRecord(userData);
      
      // Store user email in sessionStorage for the navbar to use
      sessionStorage.setItem('userEmail', formData.Email);
      
      // Redirect to home page after successful registration
      router.push('/');
    } catch (err: any) {
      setErrors({
        submit: err.message || 'Registration failed. Please try again.'
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
            Create Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Join our family community
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <div className="p-4 rounded-lg bg-red-50 text-sm text-red-600">
              {errors.submit}
            </div>
          )}

          <Input
            label="Name"
            name="Name"
            type="text"
            required
            value={formData.Name}
            onChange={handleChange}
            placeholder="Enter your name"
            error={errors.Name}
          />

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
            placeholder="Create a password"
            error={errors.Password}
          />

          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm your password"
            error={errors.confirmPassword}
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
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
          
          <div className="text-center mt-4 text-sm">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
