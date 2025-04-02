import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  status: 'sent' | 'delivered' | 'read'
  sender?: {
    first_name: string
    last_name: string
    email: string
  }
}

interface ConversationResponse {
  id: string
  name: string
  last_message: string | null
  last_message_time: string
  is_group: boolean
  created_at: string
  participants: {
    users: {
      id: string
      first_name: string
      last_name: string
      email: string
    }
  }[]
}

export interface Conversation {
  id: string
  name: string
  last_message: string
  last_message_time: string
  is_group: boolean
  created_at: string
  unread_count: number
  participants: {
    id: string
    first_name: string
    last_name: string
    email: string
  }[]
}

class MessagingService {
  // Get all conversations for a user
  async getUserConversations(userEmail: string): Promise<Conversation[]> {
    // First, get the user's ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (userError) throw userError
    const userId = userData.id

    // Then get the conversations with participants
    const { data: rawData, error } = await supabase
      .from('conversations')
      .select(`
        id,
        name,
        last_message,
        last_message_time,
        is_group,
        created_at,
        participants:conversation_participants(
          users (
            id,
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('conversation_participants.user_id', userId)
      .order('last_message_time', { ascending: false })

    if (error) throw error

    const data = rawData as unknown as ConversationResponse[]
    return data.map(conv => ({
      id: conv.id,
      name: conv.name,
      last_message: conv.last_message || '',
      last_message_time: conv.last_message_time,
      is_group: conv.is_group,
      created_at: conv.created_at,
      unread_count: 0, // We'll implement this later
      participants: conv.participants.map(p => p.users)
    }))
  }

  // Get messages for a conversation
  async getConversationMessages(conversationId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users (
          first_name,
          last_name,
          email
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  }

  // Send a message
  async sendMessage(message: { conversation_id: string; sender_id: string; content: string; status: 'sent' | 'delivered' | 'read' }) {
    const { data, error } = await supabase
      .from('messages')
      .insert([message])
      .select(`
        *,
        sender:users (
          first_name,
          last_name,
          email
        )
      `)
      .single()

    if (error) throw error

    // Update last_message in conversation
    await supabase
      .from('conversations')
      .update({
        last_message: message.content,
        last_message_time: new Date().toISOString()
      })
      .eq('id', message.conversation_id)

    return data
  }

  // Create a new conversation
  async createConversation(name: string, participantEmails: string[], isGroup: boolean = false) {
    // Get user IDs from emails
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .in('email', participantEmails)

    if (userError) throw userError

    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert([
        {
          name,
          is_group: isGroup,
          created_by: users[0].id // First user is the creator
        },
      ])
      .select()
      .single()

    if (convError) throw convError

    // Add participants
    const participantRows = users.map((user) => ({
      conversation_id: conversation.id,
      user_id: user.id,
      unread_count: 0
    }))

    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert(participantRows)

    if (partError) throw partError

    return conversation
  }

  // Subscribe to new messages
  subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
    return supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch the complete message with sender info
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users (
                first_name,
                last_name,
                email
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            callback(data as Message)
          }
        }
      )
      .subscribe()
  }
}

export const messagingService = new MessagingService()
