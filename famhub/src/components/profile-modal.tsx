'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Maximize2, Minimize2, Activity } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface ProfileViewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileViewModal({ isOpen, onClose }: ProfileViewModalProps) {
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [userData, setUserData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: '',
    persona: '',
    bio: '',
    phone_number: '',
    created_at: '',
    status: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      setLoading(true);
      
      // Get user email from sessionStorage
      const userEmail = sessionStorage.getItem('userEmail');
      
      if (!userEmail) {
        setLoading(false);
        return;
      }
      
      try {
        // Set user context for RLS policies
        await supabase.rpc('set_user_context', { user_email: userEmail });
        
        // Fetch user data
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', userEmail)
          .single();
          
        if (error) {
          console.error('Error fetching user data:', error);
        } else if (data) {
          setUserData({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            email: data.email || '',
            role: data.role || '',
            persona: data.persona || '',
            bio: data.bio || '',
            phone_number: data.phone_number || '',
            created_at: new Date(data.created_at).toLocaleDateString(),
            status: data.status || ''
          });
        }
      } catch (error) {
        console.error('Error in fetchUserData:', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (isOpen) {
      fetchUserData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-y-0 right-0 z-50 w-full ${isFullWidth ? 'md:w-full' : 'md:w-1/2'} bg-black/70 transform transition-all duration-300 ease-in-out translate-x-0`}
      onClick={onClose}
    >
      <div
        className="h-full flex flex-col overflow-hidden rounded-l-2xl relative"
        style={{ background: '#1E1F29' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <Button
            variant="ghost"
            size="icon"
            style={{ background: '#232336', color: '#fff' }}
            onClick={(e) => {
              e.stopPropagation();
              setIsFullWidth(!isFullWidth);
            }}
          >
            {isFullWidth ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            style={{ background: '#232336', color: '#fff' }}
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Cover Image */}
        <div className="w-full h-48 bg-gradient-to-r from-[#181926] via-[#232336] to-[#23233b] overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30"></div>
          
          {/* Name and title overlay on cover image */}
          <div className="absolute bottom-4 left-45 text-right">
            <h1 className="text-3xl font-bold text-white">
              {userData.first_name} {userData.last_name}
            </h1>
            <p className="text-gray-200">
              {userData.role} • {userData.persona}
            </p>
          </div>
        </div>

        {/* Profile Image */}
        <div className="absolute top-24 left-6 w-32 h-32 rounded-full border-4 border-[#1E1F29] overflow-hidden bg-[#232336] z-10">
          <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
            {userData.first_name && userData.first_name.charAt(0)}
          </div>
        </div>

        {/* Bio Section */}
        {userData.bio && (
          <div className="ml-40 mt-2 p-4 mx-6">
            <p style={{ color: '#e5e7eb' }}>{userData.bio}</p>
          </div>
        )}
        
        {/* Profile Content */}
        <div className="flex-grow overflow-y-auto pt-4">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Profile Header */}
              <div className="px-6 pb-6 pt-16">

                

                {/* Stats */}
                <div className="flex items-center gap-4 mt-6 text-sm border-t pt-4" style={{ color: '#e5e7eb', borderColor: '#232336' }}>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Last active now</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">1 Post</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">1 Follower</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">0 Following</span>
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              <div className="px-6 py-4 space-y-6">

                {/* Contact Information */}
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold" style={{ color: '#fff' }}>Contact Information</h2>
                  <div className="space-y-1 text-sm">
                    <p style={{ color: '#e5e7eb' }}><strong>Email:</strong> {userData.email}</p>
                    {userData.phone_number && (
                      <p style={{ color: '#e5e7eb' }}><strong>Phone:</strong> {userData.phone_number}</p>
                    )}
                  </div>
                </div>

                {/* Account Information */}
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold" style={{ color: '#fff' }}>Account Information</h2>
                  <div className="space-y-1 text-sm">
                    <p style={{ color: '#e5e7eb' }}><strong>Status:</strong> {userData.status}</p>
                    <p style={{ color: '#e5e7eb' }}><strong>Joined:</strong> {userData.created_at}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}