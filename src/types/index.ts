export interface Profile {
  id: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  preferred_activities: string[];
  reputation_score: number;
  events_attended: number;
  events_created: number;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  activity_type: string;
  skill_level: 'beginner' | 'intermediate' | 'pro' | 'any';
  location: { lat: number; lng: number };
  location_name: string;
  starts_at: string;
  ends_at?: string;
  total_spots: number;
  spots_taken: number;
  min_participants: number;
  cost_per_person: number;
  is_now: boolean;
  min_reputation: number;
  status: 'active' | 'full' | 'cancelled' | 'completed' | 'archived';
  created_at: string;
  creator?: Profile;
  participants?: Participant[];
  distance_km?: number;
}

export interface Participant {
  id: string;
  event_id: string;
  user_id: string;
  joined_at: string;
  attended?: boolean;
  profile?: Profile;
}

export interface ChatMessage {
  id: string;
  event_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'now_nearby' | 'event_reminder' | 'event_modified' | 'new_participant' | 'event_cancelled' | 'rally_request_fulfilled';
  title: string;
  body?: string;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface RallyRequest {
  id: string;
  user_id: string;
  activity_type: string;
  description?: string;
  time_range: string;
  radius_km: number;
  location: { lat: number; lng: number };
  location_lat: number;
  location_lng: number;
  min_people: number;
  status: 'active' | 'fulfilled' | 'expired' | 'cancelled';
  created_at: string;
  expires_at: string;
  hand_count?: number;
  user_raised_hand?: boolean;
  creator?: Profile;
  hands?: RallyRequestHand[];
}

export interface RallyRequestHand {
  id: string;
  request_id: string;
  user_id: string;
  created_at: string;
  profile?: Profile;
}

export interface MapFilters {
  activity_types: string[];
  skill_level?: string;
  day_of_week?: number;
  free_only: boolean;
  radius_km: number;
}

export interface EventFormData {
  title: string;
  description?: string;
  activity_type: string;
  skill_level: string;
  location: { lat: number; lng: number };
  location_name: string;
  starts_at: string;
  total_spots: number;
  min_participants: number;
  cost_per_person: number;
  is_now: boolean;
  min_reputation: number;
}

export const ACTIVITY_TYPES = [
  // Sports
  { value: 'basketball', label: '🏀 Basketball', icon: '🏀' },
  { value: 'football', label: '⚽ Football/Soccer', icon: '⚽' },
  { value: 'badminton', label: '🏸 Badminton', icon: '🏸' },
  { value: 'tennis', label: '🎾 Tennis', icon: '🎾' },
  { value: 'volleyball', label: '🏐 Volleyball', icon: '🏐' },
  { value: 'table-tennis', label: '🏓 Table Tennis', icon: '🏓' },
  { value: 'cricket', label: '🏏 Cricket', icon: '🏏' },
  { value: 'frisbee', label: '🥏 Frisbee/Ultimate', icon: '🥏' },
  { value: 'golf', label: '⛳ Golf', icon: '⛳' },
  { value: 'bowling', label: '🎳 Bowling', icon: '🎳' },
  // Fitness
  { value: 'running', label: '🏃 Running', icon: '🏃' },
  { value: 'gym', label: '💪 Gym/Fitness', icon: '💪' },
  { value: 'swimming', label: '🏊 Swimming', icon: '🏊' },
  { value: 'cycling', label: '🚴 Cycling', icon: '🚴' },
  { value: 'yoga', label: '🧘 Yoga', icon: '🧘' },
  { value: 'climbing', label: '🧗 Rock Climbing', icon: '🧗' },
  { value: 'martial-arts', label: '🥋 Martial Arts', icon: '🥋' },
  { value: 'boxing', label: '🥊 Boxing', icon: '🥊' },
  // Outdoor
  { value: 'hiking', label: '🥾 Hiking', icon: '🥾' },
  { value: 'kayaking', label: '🛶 Kayaking', icon: '🛶' },
  { value: 'skateboarding', label: '🛹 Skateboarding', icon: '🛹' },
  // Social
  { value: 'coffee', label: '☕ Coffee/Social', icon: '☕' },
  { value: 'board-games', label: '🎲 Board Games', icon: '🎲' },
  { value: 'karaoke', label: '🎤 Karaoke', icon: '🎤' },
  { value: 'picnic', label: '🧺 Picnic', icon: '🧺' },
  // Creative & Learning
  { value: 'hackathon', label: '💻 Hackathon', icon: '💻' },
  { value: 'study', label: '📚 Study Session', icon: '📚' },
  { value: 'creative', label: '🎨 Creative/Art', icon: '🎨' },
  { value: 'music', label: '🎵 Music/Jam', icon: '🎵' },
  { value: 'photography', label: '📷 Photography', icon: '📷' },
  { value: 'cooking', label: '🍳 Cooking', icon: '🍳' },
  // Gaming
  { value: 'gaming', label: '🎮 Gaming', icon: '🎮' },
  { value: 'esports', label: '🖥️ Esports', icon: '🖥️' },
  // Dance
  { value: 'dance', label: '💃 Dance', icon: '💃' },
] as const;

export const SKILL_LEVELS = [
  { value: 'any', label: 'Any Level' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'pro', label: 'Pro' },
] as const;
