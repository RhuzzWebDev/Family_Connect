"use client"

import type React from "react"
import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mic, Paperclip, Send, Video, Phone } from "lucide-react"

// Mock data for conversations
const conversationsData = [
  {
    id: 1,
    name: "Mom",
    avatar: "/avatars/member1.jpg",
    lastMessage: "Don't forget about dinner tonight!",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    unread: 2,
    online: true,
  },
  {
    id: 2,
    name: "Dad",
    avatar: "/avatars/member2.jpg",
    lastMessage: "I'll pick up Emma from practice.",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    unread: 0,
    online: false,
  },
  {
    id: 3,
    name: "Sarah",
    avatar: "/avatars/member3.jpg",
    lastMessage: "Can you help me with my project?",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    unread: 0,
    online: true,
  },
  {
    id: 4,
    name: "Michael",
    avatar: "/avatars/member4.jpg",
    lastMessage: "Going to be late for dinner.",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    unread: 1,
    online: true,
  },
  {
    id: 5,
    name: "Emma",
    avatar: "/avatars/member5.jpg",
    lastMessage: "Can we go to the mall this weekend?",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    unread: 0,
    online: false,
  },
  {
    id: 6,
    name: "Family Group",
    avatar: "/avatars/family-group.jpg",
    lastMessage: "Mom: I made your favorite cookies!",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    unread: 5,
    online: true,
    isGroup: true,
  },
]

// Mock data for messages in a conversation
const messagesData = [
  {
    id: 1,
    senderId: 1, // Mom
    text: "Hi! How was school today?",
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    status: "read",
  },
  {
    id: 2,
    senderId: "me",
    text: "It was good! I got an A on my math test.",
    timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    status: "read",
  },
  {
    id: 3,
    senderId: 1, // Mom
    text: "That's wonderful! I'm so proud of you. 🎉",
    timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    status: "read",
  },
  {
    id: 4,
    senderId: 1, // Mom
    text: "Don't forget about dinner tonight. We're having your favorite!",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: "read",
  },
  {
    id: 5,
    senderId: "me",
    text: "Awesome! Can't wait. I'll be home by 6.",
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    status: "delivered",
  },
]

export function MessagingInterface() {
  const [conversations] = useState(conversationsData)
  const [messages] = useState(messagesData)
  const [selectedConversation, setSelectedConversation] = useState(conversations[0])
  const [newMessage, setNewMessage] = useState("")

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    // In a real app, you would send the message to your backend
    console.log("Sending message:", newMessage)

    // Reset input
    setNewMessage("")
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-lg border md:flex-row">
      {/* Conversations List */}
      <div className="w-full border-b md:w-80 md:border-b-0 md:border-r">
        <Tabs defaultValue="all">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold">Messages</h2>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="m-0">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`flex cursor-pointer items-center gap-3 border-b p-4 transition-colors hover:bg-muted/50 ${
                    selectedConversation.id === conversation.id ? "bg-muted" : ""
                  }`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={conversation.avatar} alt={conversation.name} />
                      <AvatarFallback>{conversation.name[0]}</AvatarFallback>
                    </Avatar>
                    {conversation.online && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background"></span>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{conversation.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.timestamp), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{conversation.lastMessage}</p>
                  </div>
                  {conversation.unread > 0 && (
                    <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                      {conversation.unread}
                    </div>
                  )}
                </div>
              ))}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="unread" className="m-0">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              {conversations
                .filter((c) => c.unread > 0)
                .map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`flex cursor-pointer items-center gap-3 border-b p-4 transition-colors hover:bg-muted/50 ${
                      selectedConversation.id === conversation.id ? "bg-muted" : ""
                    }`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={conversation.avatar} alt={conversation.name} />
                        <AvatarFallback>{conversation.name[0]}</AvatarFallback>
                      </Avatar>
                      {conversation.online && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background"></span>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{conversation.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conversation.timestamp), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{conversation.lastMessage}</p>
                    </div>
                    {conversation.unread > 0 && (
                      <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                        {conversation.unread}
                      </div>
                    )}
                  </div>
                ))}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Message Thread */}
      <div className="flex flex-1 flex-col">
        {/* Conversation Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={selectedConversation.avatar} alt={selectedConversation.name} />
              <AvatarFallback>{selectedConversation.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{selectedConversation.name}</p>
              <p className="text-xs text-muted-foreground">{selectedConversation.online ? "Online" : "Offline"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Video className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => {
              const isMe = message.senderId === "me"
              const sender = isMe
                ? { name: "You", avatar: "/avatars/me.jpg" }
                : {
                    name: conversations.find((c) => c.id === message.senderId)?.name || "Unknown",
                    avatar: conversations.find((c) => c.id === message.senderId)?.avatar || "",
                  }

              return (
                <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[80%] gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                    {!isMe && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={sender.avatar} alt={sender.name} />
                        <AvatarFallback>{sender.name[0]}</AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <div
                        className={`rounded-lg p-3 ${
                          isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                      </div>
                      <div
                        className={`mt-1 flex items-center gap-1 text-xs text-muted-foreground ${
                          isMe ? "justify-end" : ""
                        }`}
                      >
                        <span>
                          {formatDistanceToNow(new Date(message.timestamp), {
                            addSuffix: true,
                          })}
                        </span>
                        {isMe && <span className="text-xs">{message.status === "read" ? "Read" : "Delivered"}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <Card className="border-t rounded-none border-x-0 border-b-0">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-4">
            <Button type="button" variant="outline" size="icon">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1"
            />
            <Button type="button" variant="outline" size="icon">
              <Mic className="h-4 w-4" />
            </Button>
            <Button type="submit" disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
