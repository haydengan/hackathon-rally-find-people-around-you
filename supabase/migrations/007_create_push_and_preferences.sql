-- Push Subscriptions
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subscription)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- Notification Preferences
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  now_broadcasts BOOLEAN DEFAULT TRUE,
  event_reminders BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  activity_filters TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences" ON notification_preferences FOR ALL USING (auth.uid() = user_id);
