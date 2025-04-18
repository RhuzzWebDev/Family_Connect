"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FamilyInviteService } from "@/services/familyInviteService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_number: string;
  role: string;
  persona: 'Parent' | 'Children';
  bio?: string;
}

export default function InviteRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("token") || "";

  const [familyId, setFamilyId] = useState<string>("");
  const [familyName, setFamilyName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone_number: "",
    role: "Father",
    persona: "Parent",
    bio: "",
  });

  useEffect(() => {
    async function fetchInvite() {
      setLoading(true);
      setErrors({});
      try {
        const invite = await FamilyInviteService.validateInvite(inviteToken);
        if (!invite) {
          setErrors({ general: "Invalid or expired invite link." });
          setLoading(false);
          return;
        }
        setFamilyId(invite.family_id);
        setFamilyName(invite.family_name || "Family");
        setLoading(false);
      } catch (err: any) {
        setErrors({ general: err.message || "Failed to validate invite." });
        setLoading(false);
      }
    }
    if (inviteToken) fetchInvite();
    else setErrors({ general: "Missing invite token." });
  }, [inviteToken]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    
    try {
      if (!familyId) {
        setErrors({ general: "Family ID could not be determined from invite." });
        setLoading(false);
        return;
      }
      
      const { success, error: regError } = await FamilyInviteService.registerWithInvite(
        { 
          ...form, 
          family_id: familyId 
        },
        inviteToken
      );
      
      if (success) {
        toast.success("Registration successful! Redirecting to login...");
        setTimeout(() => router.push("/login"), 2000);
      } else {
        setErrors({ general: regError || "Registration failed." });
      }
    } catch (err: any) {
      setErrors({ general: err.message || "Registration failed." });
    } finally {
      setLoading(false);
    }
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
          <h2 className="text-xl font-bold">Join {familyName}</h2>
          <p className="text-sm text-gray-300 mt-1">Complete your registration with invite code</p>
        </div>
      </div>

      {/* Form Section - Right side on desktop, bottom on mobile */}
      <div className="w-full md:w-3/5 p-6 md:p-8">
        <h1 className="text-xl font-semibold text-white mb-6">Complete Your Registration</h1>
        
        {errors.general && (
          <div className="mb-5 p-2 bg-red-500/20 border border-red-500 rounded text-red-500 text-sm">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-3">
              <Label htmlFor="first_name" className="text-sm text-white font-medium block mb-1.5">
                First Name
              </Label>
              <Input
                id="first_name"
                name="first_name"
                placeholder="Enter first name"
                value={form.first_name}
                onChange={handleChange}
                required
                className={`bg-[#2a2d35] border-gray-700 text-white h-11 ${errors.first_name ? 'border-red-500' : ''}`}
                disabled={loading}
              />
              {errors.first_name && (
                <p className="text-xs text-red-500 mt-1">{errors.first_name}</p>
              )}
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="last_name" className="text-sm text-white font-medium block mb-1.5">
                Last Name
              </Label>
              <Input
                id="last_name"
                name="last_name"
                placeholder="Enter last name"
                value={form.last_name}
                onChange={handleChange}
                required
                className={`bg-[#2a2d35] border-gray-700 text-white h-11 ${errors.last_name ? 'border-red-500' : ''}`}
                disabled={loading}
              />
              {errors.last_name && (
                <p className="text-xs text-red-500 mt-1">{errors.last_name}</p>
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
              value={form.email}
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
                value={form.password}
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
            <Label htmlFor="phone_number" className="text-sm text-white font-medium block mb-1.5">
              Phone Number
            </Label>
            <Input
              id="phone_number"
              name="phone_number"
              placeholder="Enter phone number"
              value={form.phone_number}
              onChange={handleChange}
              className={`bg-[#2a2d35] border-gray-700 text-white h-11 ${errors.phone_number ? 'border-red-500' : ''}`}
              disabled={loading}
            />
            {errors.phone_number && (
              <p className="text-xs text-red-500 mt-1">{errors.phone_number}</p>
            )}
          </div>

          <div className="space-y-3 mt-1">
            <Label htmlFor="role" className="text-sm text-white font-medium block mb-1.5">
              Family Role
            </Label>
            <select
              id="role"
              name="role"
              value={form.role}
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
              value={form.persona}
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

          <div className="space-y-3 mt-1">
            <Label htmlFor="bio" className="text-sm text-white font-medium block mb-1.5">
              Bio (Optional)
            </Label>
            <textarea
              id="bio"
              name="bio"
              placeholder="Tell us about yourself"
              value={form.bio}
              onChange={handleChange}
              className={`w-full bg-[#2a2d35] border-gray-700 text-white rounded-md p-3 min-h-[80px] ${errors.bio ? 'border-red-500' : ''}`}
              disabled={loading}
            />
            {errors.bio && (
              <p className="text-xs text-red-500 mt-1">{errors.bio}</p>
            )}
          </div>

          {/* Hidden family_id field */}
          <input type="hidden" name="family_id" value={familyId} />

          <div className="pt-5 mt-3">
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Completing Registration...
                </>
              ) : (
                'Complete Registration'
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
