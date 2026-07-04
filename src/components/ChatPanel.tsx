'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@/components/ChatMessage';
import { createClient } from '@/lib/supabase/client';
import type { ChatMessage as ChatMessageType, Profile } from '@/types';

interface ChatPanelProps {
  eventId: string;
  userId: string;
}

export function ChatPanel({ eventId, userId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Fetch initial messages
  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch(`/api/events/${eventId}/chat`);
        if (res.ok) {
          const { data } = await res.json();
          setMessages(data);
        } else {
          const { error: msg } = await res.json();
          setError(msg || 'Failed to load messages');
        }
      } catch {
        setError('Failed to load messages');
      } finally {
        setLoading(false);
      }
    }

    fetchMessages();
  }, [eventId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Subscribe to realtime chat messages
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`chat:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          // Fetch the full message with sender profile
          const { data: fullMessage } = await supabase
            .from('chat_messages')
            .select(`
              id, event_id, sender_id, content, created_at,
              sender:profiles!chat_messages_sender_id_fkey(id, display_name, avatar_url, reputation_score)
            `)
            .eq('id', payload.new.id)
            .single();

          if (fullMessage) {
            // Supabase returns joined single relations; normalize to match our type
            const senderData = Array.isArray(fullMessage.sender)
              ? fullMessage.sender[0]
              : fullMessage.sender;

            const normalized: ChatMessageType = {
              id: fullMessage.id,
              event_id: fullMessage.event_id,
              sender_id: fullMessage.sender_id,
              content: fullMessage.content,
              created_at: fullMessage.created_at,
              sender: senderData as unknown as Profile | undefined,
            };

            setMessages((prev) => {
              if (prev.some((m) => m.id === normalized.id)) return prev;
              return [...prev, normalized];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content || sending) return;

    setSending(true);
    setNewMessage('');

    try {
      const res = await fetch(`/api/events/${eventId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const { data } = await res.json();
        // Add message to state (realtime will also fire, dedup handles it)
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }
    } catch {
      // Restore message on failure
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">Loading chat...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="flex flex-col gap-3 p-3 overflow-y-auto h-[calc(100vh-320px)] min-h-[300px]">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No messages yet. Start the conversation!
            </p>
          ) : (
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isOwn={msg.sender_id === userId}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t p-3 flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          maxLength={1000}
          disabled={sending}
          className="flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          size="icon"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
