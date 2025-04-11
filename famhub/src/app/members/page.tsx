'use client';

import { useEffect } from 'react';
import { Filter, Mail, MapPin, Search, Users } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { InnerNavbar } from "@/components/layout/InnerNavbar";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function MembersPage() {
  useEffect(() => {
    const userEmail = sessionStorage.getItem('userEmail');
    if (!userEmail) {
      window.location.href = '/login';
    }
  }, []);
  
  return (
    <Layout>
      <InnerNavbar />
      <div className="pl-6 pr-6 md:pl-8">
        {/* Search and Invite */}
        <div className="mb-6 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Members"
              className="w-full bg-white border border-gray-300 rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
        </div>

        {/* Members Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">All Community Members</h1>
              <p className="text-gray-600 text-sm mt-1">Connect with other members of our supportive community</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
                <Filter className="h-4 w-4 mr-2" />
                Filter Members
              </Button>
            </div>
          </div>
        </div>

        {/* Members Content */}
        <div>
          {/* Member Categories */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <Button className="bg-blue-600 hover:bg-blue-700">All Members</Button>
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
              Family Members
            </Button>
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
              Care Providers
            </Button>
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
              Healthcare Professionals
            </Button>
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
              Community Supporters
            </Button>
          </div>

          {/* Featured Members */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Founders</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <FeaturedMemberCard
                name="Dr. Sarah Johnson"
                role="Palliative Care Specialist"
                location="New York, NY"
                image="/placeholder.svg?height=150&width=150"
                bio="20+ years experience in palliative care, specializing in family support systems."
                memberSince="2023"
              />
              <FeaturedMemberCard
                name="Michael Chen"
                role="Family Caregiver"
                location="San Francisco, CA"
                image="/placeholder.svg?height=150&width=150"
                bio="Caring for my mother with terminal illness. Advocate for caregiver support."
                memberSince="2024"
              />
              <FeaturedMemberCard
                name="Norman Cuadra"
                role="Community Founder"
                location="Chicago, IL"
                image="/placeholder.svg?height=150&width=150"
                bio="Founded this community after personal experience with family terminal illness."
                memberSince="2023"
              />
              <FeaturedMemberCard
                name="Lisa Rodriguez"
                role="Support Group Leader"
                location="Miami, FL"
                image="/placeholder.svg?height=150&width=150"
                bio="Leading weekly virtual support groups for families dealing with terminal illness."
                memberSince="2023"
              />
            </div>
          </div>

          {/* All Members */}
          <div>
            <h2 className="text-xl font-semibold mb-4">All Members</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <MemberCard
                  key={i}
                  name={
                    [
                      "James Wilson",
                      "Emma Thompson",
                      "David Garcia",
                      "Sophia Lee",
                      "Robert Martinez",
                      "Olivia Brown",
                      "William Taylor",
                      "Ava Anderson",
                      "Daniel Thomas",
                      "Isabella White",
                      "Matthew Harris",
                      "Charlotte Lewis",
                    ][i]
                  }
                  role={
                    [
                      "Family Caregiver",
                      "Healthcare Professional",
                      "Community Supporter",
                      "Family Member",
                      "Nurse Practitioner",
                      "Social Worker",
                      "Family Caregiver",
                      "Therapist",
                      "Community Volunteer",
                      "Family Member",
                      "Healthcare Advocate",
                      "Support Group Member",
                    ][i]
                  }
                  location={
                    [
                      "Boston, MA",
                      "Seattle, WA",
                      "Austin, TX",
                      "Portland, OR",
                      "Denver, CO",
                      "Atlanta, GA",
                      "Philadelphia, PA",
                      "San Diego, CA",
                      "Nashville, TN",
                      "Minneapolis, MN",
                      "Phoenix, AZ",
                      "Detroit, MI",
                    ][i]
                  }
                  image={`/placeholder.svg?height=100&width=100&text=${i + 1}`}
                  memberSince={
                    ["2023", "2024", "2023", "2024", "2023", "2024", "2023", "2024", "2023", "2024", "2023", "2024"][i]
                  }
                />
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
                Load More Members
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

interface FeaturedMemberCardProps {
  name: string;
  role: string;
  location: string;
  image: string;
  bio: string;
  memberSince: string;
}

function FeaturedMemberCard({ name, role, location, image, bio, memberSince }: FeaturedMemberCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:bg-gray-50 transition-colors cursor-pointer shadow-sm">
      <div className="p-4 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full overflow-hidden mb-3">
          <Image src={image || "/placeholder.svg"} alt={name} width={80} height={80} className="object-cover" />
        </div>
        <h3 className="font-medium text-lg text-gray-900">{name}</h3>
        <div className="text-blue-600 text-sm">{role}</div>
        <div className="flex items-center text-xs text-gray-500 mt-1">
          <MapPin className="h-3 w-3 mr-1" />
          {location}
        </div>
        <p className="text-sm text-gray-600 mt-3">{bio}</p>
        <div className="text-xs text-gray-500 mt-3">Member since {memberSince}</div>

        <div className="flex gap-2 mt-4">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            Connect
          </Button>
          <Button size="sm" variant="outline" className="border-gray-300 hover:bg-gray-100">
            <Mail className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface MemberCardProps {
  name: string;
  role: string;
  location: string;
  image: string;
  memberSince: string;
}

function MemberCard({ name, role, location, image, memberSince }: MemberCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:bg-gray-50 transition-colors cursor-pointer shadow-sm">
      <div className="p-4 flex items-center">
        <div className="w-12 h-12 rounded-full overflow-hidden mr-3">
          <Image src={image || "/placeholder.svg"} alt={name} width={48} height={48} className="object-cover" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{name}</h3>
          <div className="text-sm text-blue-600">{role}</div>
          <div className="flex items-center text-xs text-gray-500 mt-0.5">
            <MapPin className="h-3 w-3 mr-1" />
            {location}
          </div>
        </div>
      </div>
      <div className="px-4 pb-4 flex items-center justify-between">
        <div className="text-xs text-gray-500">Member since {memberSince}</div>
        <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-800 p-0">
          View Profile
        </Button>
      </div>
    </div>
  );
}
