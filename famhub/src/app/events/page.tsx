'use client';

import { useEffect } from 'react';
import { Calendar, Filter, Grid, List, MapPin, Search, Users } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { InnerNavbar } from "@/components/layout/InnerNavbar";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function EventsPage() {
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
        {/* Events Header */}
        <div className="mb-6 pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Upcoming Events</h1>
              <p className="text-gray-600">
                Join our community events to connect, learn, and support each other
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
                <Calendar className="h-4 w-4 mr-2" />
                Calendar View
              </Button>
              <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <div className="flex border border-gray-300 rounded-md overflow-hidden">
                <Button variant="ghost" size="icon" className="bg-blue-600 hover:bg-blue-700 text-white rounded-none h-9 w-9">
                  <List className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="bg-gray-100 hover:bg-gray-200 rounded-none h-9 w-9">
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Events"
              className="w-full bg-white border border-gray-300 rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Featured Event */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6 shadow-sm">
          <div className="relative h-48 md:h-64">
            <Image src="/placeholder.svg?height=300&width=1200" alt="Featured Event" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6">
              <div className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm inline-block mb-2">
                Featured Event
              </div>
              <h2 className="text-2xl font-bold text-white">Annual Community Conference</h2>
              <p className="text-gray-200 mt-1">
                Join us for our biggest event of the year with expert speakers and networking
              </p>
            </div>
          </div>
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div>
                <div className="text-gray-500 text-sm">Date & Time</div>
                <div className="font-medium">May 15, 2025 • 9:00 AM - 5:00 PM</div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">Location</div>
                <div className="font-medium flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  Virtual & City Conference Center
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">Attendees</div>
                <div className="font-medium flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  128 registered
                </div>
              </div>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">Register Now</Button>
          </div>
        </div>

        {/* Event Categories */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button className="bg-blue-600 hover:bg-blue-700">All Events</Button>
          <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
            Support Groups
          </Button>
          <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
            Workshops
          </Button>
          <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
            Q&A Sessions
          </Button>
          <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
            Social Gatherings
          </Button>
        </div>

        {/* Events List */}
        <div className="space-y-4 mb-8">
          <EventCard
            title="Virtual Support Group Meeting"
            date="April 15, 2025"
            time="6:00 PM - 7:30 PM"
            location="Zoom"
            attendees={18}
            description="Join our weekly virtual support group for family members and caregivers."
            image="/placeholder.svg?height=200&width=300"
          />

          <EventCard
            title="Expert Q&A: Palliative Care Basics"
            date="April 17, 2025"
            time="2:00 PM - 3:30 PM"
            location="Zoom + YouTube Live"
            attendees={32}
            description="Learn about palliative care options from our panel of healthcare professionals."
            image="/placeholder.svg?height=200&width=300"
          />

          <EventCard
            title="Community Coffee Hour"
            date="April 20, 2025"
            time="10:00 AM - 11:00 AM"
            location="Virtual Lounge"
            attendees={24}
            description="Informal gathering to connect with other community members in a relaxed setting."
            image="/placeholder.svg?height=200&width=300"
          />

          <EventCard
            title="Navigating Healthcare Systems Workshop"
            date="April 22, 2025"
            time="1:00 PM - 3:00 PM"
            location="Zoom"
            attendees={45}
            description="A practical workshop on navigating complex healthcare systems and insurance."
            image="/placeholder.svg?height=200&width=300"
          />

          <EventCard
            title="Caregiver Self-Care Session"
            date="April 25, 2025"
            time="5:00 PM - 6:30 PM"
            location="Zoom"
            attendees={29}
            description="Learn essential self-care practices for those providing care to loved ones."
            image="/placeholder.svg?height=200&width=300"
          />

          <EventCard
            title="Family Communication Strategies"
            date="April 28, 2025"
            time="7:00 PM - 8:30 PM"
            location="Zoom"
            attendees={37}
            description="Effective communication strategies for families dealing with terminal illness."
            image="/placeholder.svg?height=200&width=300"
          />
        </div>
      </div>
    </Layout>
  );
}

interface EventCardProps {
  title: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
  description: string;
  image: string;
}

function EventCard({ title, date, time, location, attendees, description, image }: EventCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col md:flex-row hover:bg-gray-50 transition-colors cursor-pointer shadow-sm">
      <div className="md:w-48 h-32 md:h-auto overflow-hidden">
        <Image
          src={image || "/placeholder.svg"}
          alt={title}
          width={200}
          height={150}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-medium text-lg text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>

        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            {date} • {time}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2" />
            {location}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Users className="h-4 w-4 mr-2" />
            {attendees} attending
          </div>
        </div>
      </div>
      <div className="p-4 flex items-center justify-center md:border-l border-gray-200">
        <Button className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">Join Event</Button>
      </div>
    </div>
  );
}