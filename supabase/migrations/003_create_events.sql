-- Events table with PostGIS location
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles(id) NOT NULL,
  title VARCHAR(80) NOT NULL,
  description VARCHAR(500),
  activity_type VARCHAR(30) NOT NULL,
  skill_level VARCHAR(20) DEFAULT 'any' CHECK (skill_level IN ('beginner', 'intermediate', 'pro', 'any')),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  location_name VARCHAR(200) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  total_spots INT NOT NULL CHECK (total_spots >= 2 AND total_spots <= 50),
  spots_taken INT DEFAULT 1,
  min_participants INT DEFAULT 2,
  cost_per_person NUMERIC(6,2) DEFAULT 0,
  is_now BOOLEAN DEFAULT FALSE,
  min_reputation INT DEFAULT 0 CHECK (min_reputation >= 0 AND min_reputation <= 80),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'full', 'cancelled', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_events_location ON events USING GIST (location);
CREATE INDEX idx_events_activity_type ON events (activity_type);
CREATE INDEX idx_events_starts_at ON events (starts_at);
CREATE INDEX idx_events_status ON events (status);
CREATE INDEX idx_events_is_now ON events (is_now) WHERE is_now = TRUE;
CREATE INDEX idx_events_creator ON events (creator_id);

-- Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active events" ON events FOR SELECT USING (status IN ('active', 'full'));
CREATE POLICY "Authenticated users can create events" ON events FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their events" ON events FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete their events" ON events FOR DELETE USING (auth.uid() = creator_id);
