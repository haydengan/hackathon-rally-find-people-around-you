-- Event Participants (join table)
CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  attended BOOLEAN,
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_participants_event ON event_participants (event_id);
CREATE INDEX idx_participants_user ON event_participants (user_id);

ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view participants" ON event_participants FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join events" ON event_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave events" ON event_participants FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Event creators can update attendance" ON event_participants FOR UPDATE USING (
  EXISTS (SELECT 1 FROM events WHERE events.id = event_participants.event_id AND events.creator_id = auth.uid())
);
