'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Layout } from '@/components/layout/Layout';
import { ProfileService } from '@/services/profileService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { data: session } = useSession();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    phone_number: ''
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!session?.user?.email) return;
      
      setLoading(true);
      try {
        const profile = await ProfileService.getProfile(session.user.email);
        if (profile) {
          setUserData(profile);
          setFormData({
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            bio: profile.bio || '',
            phone_number: profile.phone_number || ''
          });
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [session]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.id) return;
    
    try {
      const updatePayload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        bio: formData.bio,
        phone_number: formData.phone_number
      };
      
      const updatedProfile = await ProfileService.updateProfile(userData.id, updatePayload);
      
      if (updatedProfile) {
        setUserData(updatedProfile);
        setIsEditing(false);
        toast.success('Profile updated successfully', {
          description: 'Your changes have been saved',
          position: 'top-center'
        });
      } else {
        toast.error('Failed to update profile', {
          description: 'Please try again',
          position: 'top-center'
        });
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error('Error updating profile', {
        description: 'An unexpected error occurred',
        position: 'top-center'
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-6 mb-8">
              <Avatar className="w-24 h-24">
                <AvatarImage src={userData?.avatar_url} />
                <AvatarFallback>
                  {userData?.first_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-2 w-full">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="bg-[#1E1F29] border-[#232336] text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="bg-[#1E1F29] border-[#232336] text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone_number">Phone</Label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="bg-[#1E1F29] border-[#232336] text-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-[#1E1F29] rounded-lg">
                <h2 className="text-lg font-semibold mb-2">About</h2>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    className="min-h-[100px] w-full rounded-md border border-[#232336] bg-[#1E1F29] px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  className="bg-[#232336] hover:bg-[#2a2b3a] text-white flex-1"
                >
                  Save Changes
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="bg-[#232336] hover:bg-[#2a2b3a] text-white flex-1"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-6 mb-8">
              <Avatar className="w-24 h-24">
                <AvatarImage src={userData?.avatar_url} />
                <AvatarFallback>
                  {userData?.first_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h1 className="text-2xl font-bold">
                  {loading ? 'Loading...' : `${userData?.first_name || ''} ${userData?.last_name || ''}` || 'Profile'}
                </h1>
                <p className="text-gray-400">{session?.user?.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-[#1E1F29] rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Account Information</h2>
                
                {loading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {userData?.role && <p><span className="text-gray-400">Role:</span> {userData.role}</p>}
                    {userData?.status && <p><span className="text-gray-400">Status:</span> {userData.status}</p>}
                    {userData?.phone_number && <p><span className="text-gray-400">Phone:</span> {userData.phone_number}</p>}
                    <p><span className="text-gray-400">Member since:</span> 
                      {new Date(userData?.created_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#1E1F29] rounded-lg">
                <h2 className="text-lg font-semibold mb-2">About</h2>
                {userData?.bio ? (
                  <div className="whitespace-pre-line text-sm">{userData.bio}</div>
                ) : (
                  <p className="text-sm text-gray-400">No bio yet</p>
                )}
              </div>

              <Button 
                className="bg-[#232336] hover:bg-[#2a2b3a] text-white w-full mt-4"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}