-- Chat Messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_event ON chat_messages (event_id, created_at);
CREATE INDEX idx_chat_sender ON chat_messages (sender_id);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view chat" ON chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM event_participants WHERE event_participants.event_id = chat_messages.event_id AND event_participants.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM events WHERE events.id = chat_messages.event_id AND events.creator_id = auth.uid())
);
CREATE POLICY "Participants can send messages" ON chat_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND (
    EXISTS (SELECT 1 FROM event_participants WHERE event_participants.event_id = chat_messages.event_id AND event_participants.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM events WHERE events.id = chat_messages.event_id AND events.creator_id = auth.uid())
  )
);
