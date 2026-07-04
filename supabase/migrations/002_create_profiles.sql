-- User Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(40) NOT NULL,
  bio VARCHAR(160),
  avatar_url VARCHAR(500),
  preferred_activities TEXT[] DEFAULT '{}',
  reputation_score INT DEFAULT 100 CHECK (reputation_score >= 0 AND reputation_score <= 100),
  events_attended INT DEFAULT 0,
  events_created INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
