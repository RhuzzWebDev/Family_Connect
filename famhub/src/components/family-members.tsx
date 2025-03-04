"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Mail, Phone, Video } from "lucide-react"

// Mock data for family members
const familyMembersData = [
  {
    id: 1,
    name: "Mom",
    avatar: "/avatars/member1.jpg",
    role: "Parent",
    status: "online",
    lastActive: "Just now",
    bio: "Family chef and organizer. Always here to help!",
    birthday: "March 15",
    phone: "+1 (555) 123-4567",
    email: "mom@familyconnect.com",
  },
  {
    id: 2,
    name: "Dad",
    avatar: "/avatars/member2.jpg",
    role: "Parent",
    status: "offline",
    lastActive: "2 hours ago",
    bio: "Tech enthusiast and weekend hiker. Ask me about gadgets!",
    birthday: "July 22",
    phone: "+1 (555) 123-4568",
    email: "dad@familyconnect.com",
  },
  {
    id: 3,
    name: "Sarah",
    avatar: "/avatars/member3.jpg",
    role: "Daughter",
    status: "online",
    lastActive: "5 minutes ago",
    bio: "College student studying biology. Love animals and nature.",
    birthday: "October 5",
    phone: "+1 (555) 123-4569",
    email: "sarah@familyconnect.com",
  },
  {
    id: 4,
    name: "Michael",
    avatar: "/avatars/member4.jpg",
    role: "Son",
    status: "away",
    lastActive: "30 minutes ago",
    bio: "High school senior. Basketball team captain. Music lover.",
    birthday: "January 12",
    phone: "+1 (555) 123-4570",
    email: "michael@familyconnect.com",
  },
  {
    id: 5,
    name: "Emma",
    avatar: "/avatars/member5.jpg",
    role: "Daughter",
    status: "online",
    lastActive: "Just now",
    bio: "Middle school student. Loves art, dance, and reading.",
    birthday: "April 30",
    phone: "+1 (555) 123-4571",
    email: "emma@familyconnect.com",
  },
]

export function FamilyMembers() {
  const [members] = useState(familyMembersData)

  return (
    <>
      {members.map((member) => (
        <Card key={member.id} className="overflow-hidden hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback>{member.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{member.name}</CardTitle>
                  <CardDescription>{member.role}</CardDescription>
                </div>
              </div>
              <Badge
                variant={member.status === "online" ? "default" : member.status === "away" ? "outline" : "secondary"}
                className="capitalize"
              >
                {member.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Last active: {member.lastActive}</p>
            <p className="text-sm">{member.bio}</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Birthday: {member.birthday}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{member.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{member.email}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1">
              <Mail className="mr-2 h-4 w-4" />
              Message
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <Phone className="mr-2 h-4 w-4" />
              Call
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <Video className="mr-2 h-4 w-4" />
              Video
            </Button>
          </CardFooter>
        </Card>
      ))}
    </>
  )
}
