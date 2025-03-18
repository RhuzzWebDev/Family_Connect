'use client';

import { useState } from 'react';
import { AirtableService, UserFields, UserRole, UserPersona } from '@/services/airtableService';
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

interface FormData {
  first_name: string;
  last_name: string;
  Email: string;
  Password: string;
  confirmPassword: string;
  role: UserRole;
  persona: UserPersona;
}

export default function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    Email: '',
    Password: '',
    confirmPassword: '',
    role: 'Father',
    persona: 'Parent'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const roles: UserRole[] = [
    'Father',
    'Grandfather',
    'Grandmother',
    'Middle Brother',
    'Middle Sister',
    'Mother',
    'Older Brother',
    'Older Sister',
    'Youngest Brother',
    'Youngest Sister'
  ];

  const personas: UserPersona[] = ['Parent', 'Children'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value as string
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validate form
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
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
    if (!formData.role) newErrors.role = 'Role is required';
    if (!formData.persona) newErrors.persona = 'Persona is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const userService = new AirtableService();
      
      const hashedPassword = await hashPassword(formData.Password);
      
      const userData: UserFields = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        Email: formData.Email,
        Password: hashedPassword,
        Confirm_Password: hashedPassword,
        role: formData.role,
        persona: formData.persona,
        Status: 'Active'
      };
      
      await userService.createRecord(userData);
      sessionStorage.setItem('userEmail', formData.Email);
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
            label="First Name"
            name="first_name"
            type="text"
            required
            value={formData.first_name}
            onChange={handleChange}
            placeholder="Enter your first name"
            error={errors.first_name}
          />

          <Input
            label="Last Name"
            name="last_name"
            type="text"
            required
            value={formData.last_name}
            onChange={handleChange}
            placeholder="Enter your last name"
            error={errors.last_name}
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

          <SelectInput
            label="Role"
            name="role"
            required
            value={formData.role}
            onChange={handleChange}
            options={roles}
            error={errors.role}
          />

          <SelectInput
            label="Persona"
            name="persona"
            required
            value={formData.persona}
            onChange={handleChange}
            options={personas}
            error={errors.persona}
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
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          <div className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
