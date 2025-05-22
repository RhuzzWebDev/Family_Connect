'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  
  // Get the callback URL from the query parameters
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';
  
  // If user is already authenticated, redirect to callback URL
  useEffect(() => {
    if (status === 'authenticated' && session) {
      console.log('User already authenticated, redirecting to:', callbackUrl);
      window.location.href = callbackUrl;
    }
  }, [status, session, callbackUrl]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      // Validate form
      const validationErrors: Record<string, string> = {};
      
      if (!formData.email.trim()) {
        validationErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        validationErrors.email = 'Invalid email format';
      }
      
      if (!formData.password) {
        validationErrors.password = 'Password is required';
      }
      
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setLoading(false);
        return;
      }

      try {
        // Login with NextAuth.js
        const result = await signIn('credentials', {
          redirect: false,
          email: formData.email,
          password: formData.password,
          callbackUrl: callbackUrl
        });
        
        if (result?.error) {
          // Handle authentication error
          toast.error('Invalid email or password');
          setLoading(false);
          return;
        }
        
        // Show success message
        toast.success('Login successful!');
        
        // Get the callback URL from the result or use dashboard as default
        const redirectUrl = result?.url || callbackUrl;
        console.log('Redirecting to:', redirectUrl);
        
        // Force a hard navigation to ensure the session is properly loaded
        window.location.href = redirectUrl;
      } catch (error: any) {
        console.error('Error during sign in:', error);
        throw error;
      }
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error(err.message || 'Login failed');
      setErrors({ general: err.message || 'Login failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[#1a1c23]">
      {/* Left side - Image */}
      <div className="relative w-full md:w-1/2 bg-gradient-to-br from-blue-900/80 to-purple-900/80">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative h-60 md:h-full w-full">
          <Image 
            src="/family.jpg" 
            alt="Family Connect" 
            fill 
            className="object-contain md:object-cover"
            priority
          />
        </div>
      </div>
      
      {/* Right side - Login Form */}
      <div className="w-full md:w-1/2 p-6 md:p-12 flex items-center justify-center bg-[#1a1c23]">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Sign in to your account to continue
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {errors.general && (
              <div className="p-3 mb-3 text-sm text-red-500 bg-red-100/10 rounded-md">
                {errors.general}
              </div>
            )}
            
            <div className="space-y-3">
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
                  placeholder="Enter your password"
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

            <div className="pt-5 mt-3">
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-medium"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </div>
            
            <div className="text-center mt-4">
              <Link 
                href="/register" 
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Don&apos;t have an account? Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
