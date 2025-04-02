"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mic, Paperclip, Send, Video, Phone } from "lucide-react"
import { messagingService } from "@/lib/services/MessagingService"
import type { Message, Conversation } from "@/lib/services/MessagingService"
import { supabase } from "@/lib/supabase"

export function MessagingInterface() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)

  // Fetch conversations for the current user
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const userId = sessionStorage.getItem('userEmail') // Using email as ID for now
        if (!userId) return
        
        const userConversations = await messagingService.getUserConversations(userId)
        setConversations(userConversations)
        if (userConversations.length > 0) {
          setSelectedConversation(userConversations[0])
        }
      } catch (error) {
        console.error('Error fetching conversations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
  }, [])

  // Fetch messages when conversation is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation) return
      
      try {
        const conversationMessages = await messagingService.getConversationMessages(selectedConversation.id)
        setMessages(conversationMessages)
      } catch (error) {
        console.error('Error fetching messages:', error)
      }
    }

    fetchMessages()
  }, [selectedConversation])

  // Subscribe to new messages
  useEffect(() => {
    if (!selectedConversation) return

    const subscription = messagingService.subscribeToMessages(
      selectedConversation.id,
      (newMessage) => {
        setMessages(prev => [...prev, newMessage])
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [selectedConversation])

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return

    const userId = sessionStorage.getItem('userEmail')
    if (!userId) return

    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', userId)
        .single()

      if (error || !userData) {
        console.error('Error getting user ID:', error)
        return
      }

      await messagingService.sendMessage({
        conversation_id: selectedConversation.id,
        sender_id: userData.id,
        content: newMessage,
        status: 'sent'
      })

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  if (loading) {
    return <div className="flex h-[calc(100vh-12rem)] items-center justify-center">Loading...</div>
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
                    selectedConversation?.id === conversation.id ? "bg-muted" : ""
                  }`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={`/avatars/default.jpg`} alt={conversation.name} />
                      <AvatarFallback>{conversation.name[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {conversation.is_group 
                          ? conversation.name 
                          : `${conversation.participants[0]?.first_name} ${conversation.participants[0]?.last_name}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.last_message_time), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{conversation.last_message}</p>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="unread" className="m-0">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              {conversations
                .filter((c) => c.unread_count > 0)
                .map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`flex cursor-pointer items-center gap-3 border-b p-4 transition-colors hover:bg-muted/50 ${
                      selectedConversation?.id === conversation.id ? "bg-muted" : ""
                    }`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={`/avatars/default.jpg`} alt={conversation.name} />
                        <AvatarFallback>{conversation.name[0]}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {conversation.is_group 
                            ? conversation.name 
                            : `${conversation.participants[0]?.first_name} ${conversation.participants[0]?.last_name}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conversation.last_message_time), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{conversation.last_message}</p>
                    </div>
                  </div>
                ))}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Message Thread */}
      {selectedConversation ? (
        <div className="flex flex-1 flex-col">
          {/* Conversation Header */}
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={`/avatars/default.jpg`} alt={selectedConversation.name} />
                <AvatarFallback>{selectedConversation.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedConversation.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedConversation.is_group ? 'Group Chat' : 'Direct Message'}
                </p>
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
                const isMe = message.sender_id === sessionStorage.getItem('userEmail')

                return (
                  <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`flex max-w-[80%] gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                      {!isMe && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`/avatars/default.jpg`} alt="Sender" />
                          <AvatarFallback>S</AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <div
                          className={`rounded-lg p-3 ${
                            isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                        <div
                          className={`mt-1 flex items-center gap-1 text-xs text-muted-foreground ${
                            isMe ? "justify-end" : ""
                          }`}
                        >
                          <span>
                            {formatDistanceToNow(new Date(message.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                          {isMe && <span className="text-xs">{message.status}</span>}
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
            <form onSubmit={(e) => e.preventDefault()} className="flex items-center gap-2 p-4">
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
              <Button type="button" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </Card>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          Select a conversation to start messaging
        </div>
      )}
    </div>
  )
}