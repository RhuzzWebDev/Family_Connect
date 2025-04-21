'use client';

import { useState } from 'react';
import { UserService } from '../../services/userService';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';


interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      await UserService.registerUser({
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: 'Father', // Default, can be changed later
        persona: 'Parent', // Default, can be changed later
      });
      router.push('/login');
    } catch (err: any) {
      setErrors({ general: err.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword((prev) => !prev);

  return (
    <div className="w-full max-w-3xl mx-auto bg-[#1a1d24] rounded-lg overflow-hidden shadow-lg flex flex-col md:flex-row">
      {/* Image Section */}
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
      {/* Form Section */}
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
              <Label htmlFor="firstName" className="text-sm text-white font-medium block mb-1.5">First Name</Label>
              <Input id="firstName" name="firstName" placeholder="Enter first name" value={formData.firstName} onChange={handleChange} required className={`bg-[#2a2d35] border-gray-700 text-white h-11 ${errors.firstName ? 'border-red-500' : ''}`} disabled={loading} />
              {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
            </div>
            <div className="space-y-3">
              <Label htmlFor="lastName" className="text-sm text-white font-medium block mb-1.5">Last Name</Label>
              <Input id="lastName" name="lastName" placeholder="Enter last name" value={formData.lastName} onChange={handleChange} required className={`bg-[#2a2d35] border-gray-700 text-white h-11 ${errors.lastName ? 'border-red-500' : ''}`} disabled={loading} />
              {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
            </div>
          </div>
          <div className="space-y-3 mt-1">
            <Label htmlFor="email" className="text-sm text-white font-medium block mb-1.5">Email Address</Label>
            <Input id="email" name="email" type="email" placeholder="Enter your email" value={formData.email} onChange={handleChange} required className={`bg-[#2a2d35] border-gray-700 text-white h-11 ${errors.email ? 'border-red-500' : ''}`} disabled={loading} />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div className="space-y-3 mt-1">
            <Label htmlFor="password" className="text-sm text-white font-medium block mb-1.5">Password</Label>
            <div className="relative">
              <Input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Create a password" value={formData.password} onChange={handleChange} required className={`bg-[#2a2d35] border-gray-700 text-white pr-10 h-11 ${errors.password ? 'border-red-500' : ''}`} disabled={loading} />
              <button type="button" onClick={togglePasswordVisibility} className="absolute right-3 top-3 text-gray-400 hover:text-white" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>
          <div className="space-y-3 mt-1">
            <Label htmlFor="confirmPassword" className="text-sm text-white font-medium block mb-1.5">Confirm Password</Label>
            <div className="relative">
              <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleChange} required className={`bg-[#2a2d35] border-gray-700 text-white pr-10 h-11 ${errors.confirmPassword ? 'border-red-500' : ''}`} disabled={loading} />
              <button type="button" onClick={toggleConfirmPasswordVisibility} className="absolute right-3 top-3 text-gray-400 hover:text-white" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
          </div>
          <div className="pt-4">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-medium"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Register'}
            </Button>
          </div>
          <div className="flex items-center my-4">
            <span className="flex-grow h-px bg-gray-200" />
            <span className="px-2 text-gray-400 text-sm">or sign up with</span>
            <span className="flex-grow h-px bg-gray-200" />
          </div>
          <div className="flex gap-4">
            <Button
              type="button"
              className="w-1/3 flex items-center justify-center gap-2 bg-[#2a2d35] text-white border border-white hover:bg-[#23252b] hover:border-blue-600 transition-colors font-medium"
              onClick={() => signIn('google')}
            >
              <span className="[&>svg]:h-5 [&>svg]:w-5 [&>svg]:fill-[#ea4335]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
                </svg>
              </span>
              <span>Google</span>
            </Button>
            <Button
              type="button"
              className="w-1/3 flex items-center justify-center gap-2 bg-[#2a2d35] text-white border border-white hover:bg-[#23252b] hover:border-blue-600 transition-colors font-medium"
              onClick={() => signIn('facebook')}
            >
              <span className="[&>svg]:h-5 [&>svg]:w-5 [&>svg]:fill-[#1877f2]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
                  <path d="M80 299.3V512H196V299.3h86.5l18-97.8H196V166.9c0-51.7 20.3-71.5 72.7-71.5c16.3 0 29.4 .4 37 1.2V7.9C291.4 4 256.4 0 236.2 0C129.3 0 80 50.5 80 159.4v42.1H14v97.8H80z" />
                </svg>
              </span>
              <span>Facebook</span>
            </Button>
            <Button
              type="button"
              className="w-1/3 flex items-center justify-center gap-2 bg-[#2a2d35] text-white border border-white hover:bg-[#23252b] hover:border-blue-600 transition-colors font-medium"
              onClick={() => signIn('linkedin')}
            >
              <span className="[&>svg]:h-5 [&>svg]:w-5 [&>svg]:fill-[#0077b5]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                  <path d="M100.3 448H7.4V148.9h92.9zM53.8 108.1C24.1 108.1 0 83.5 0 53.8a53.8 53.8 0 0 1 107.6 0c0 29.7-24.1 54.3-53.8 54.3zM447.9 448h-92.7V302.4c0-34.7-.7-79.2-48.3-79.2-48.3 0-55.7 37.7-55.7 76.7V448h-92.8V148.9h89.1v40.8h1.3c12.4-23.5 42.7-48.3 87.9-48.3 94 0 111.3 61.9 111.3 142.3V448z" />
                </svg>
              </span>
              <span>LinkedIn</span>
            </Button>
          </div>
          <p className="text-center text-sm mt-4">Already have an account? <a href="/login" className="text-blue-600 hover:underline">Sign in</a></p>
        </form>
      </div>
    </div>
  );
}
