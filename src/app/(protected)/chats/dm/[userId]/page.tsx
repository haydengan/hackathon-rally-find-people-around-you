'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface PartnerProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export default function DMChatPage() {
  const params = useParams();
  const router = useRouter();
  const partnerId = params.userId as string;

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Fetch partner profile and messages
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // Fetch partner profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('id', partnerId)
        .single();

      if (profileData) setPartner(profileData);

      // Fetch messages
      try {
        const res = await fetch(`/api/dm/${partnerId}`);
        if (res.ok) {
          const { data } = await res.json();
          setMessages(data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [partnerId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Subscribe to realtime DMs
  useEffect(() => {
    if (!currentUserId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`dm:${currentUserId}:${partnerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const msg = payload.new as DirectMessage;
          // Only add messages relevant to this conversation
          const isRelevant =
            (msg.sender_id === currentUserId && msg.receiver_id === partnerId) ||
            (msg.sender_id === partnerId && msg.receiver_id === currentUserId);

          if (isRelevant) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, partnerId]);

  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content || sending) return;

    setSending(true);
    setNewMessage('');

    try {
      const res = await fetch(`/api/dm/${partnerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const { data } = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }
    } catch {
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
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/chats')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {partner && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={partner.avatar_url ?? undefined} alt={partner.display_name} />
              <AvatarFallback className="text-sm">
                {partner.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm truncate">{partner.display_name}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="flex flex-col gap-3 p-3 overflow-y-auto h-[calc(100vh-140px)]">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No messages yet. Say hello!
            </p>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="break-words">{msg.content}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
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
