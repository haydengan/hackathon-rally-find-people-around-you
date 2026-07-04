'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

interface NotificationPreferences {
  now_broadcasts: boolean;
  event_reminders: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  activity_filters: string[];
}

const ACTIVITY_OPTIONS = [
  { value: 'new_participant', label: 'New participants joining your events' },
  { value: 'event_modified', label: 'Events you joined get modified' },
  { value: 'event_cancelled', label: 'Events you joined get cancelled' },
  { value: 'chat_messages', label: 'New chat messages' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    now_broadcasts: true,
    event_reminders: true,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    activity_filters: ['new_participant', 'event_modified', 'event_cancelled', 'chat_messages'],
  });

  useEffect(() => {
    async function loadPreferences() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('notification_preferences')
          .select('now_broadcasts, event_reminders, quiet_hours_start, quiet_hours_end, activity_filters')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setPreferences({
            now_broadcasts: data.now_broadcasts ?? true,
            event_reminders: data.event_reminders ?? true,
            quiet_hours_start: data.quiet_hours_start ?? '22:00',
            quiet_hours_end: data.quiet_hours_end ?? '08:00',
            activity_filters: data.activity_filters ?? ['new_participant', 'event_modified', 'event_cancelled', 'chat_messages'],
          });
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    }
    loadPreferences();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          now_broadcasts: preferences.now_broadcasts,
          event_reminders: preferences.event_reminders,
          quiet_hours_start: preferences.quiet_hours_start,
          quiet_hours_end: preferences.quiet_hours_end,
          activity_filters: preferences.activity_filters,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Error saving preferences:', error);
      }
    } catch {
      console.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleActivityFilter = (value: string) => {
    setPreferences((prev) => ({
      ...prev,
      activity_filters: prev.activity_filters.includes(value)
        ? prev.activity_filters.filter((f) => f !== value)
        : [...prev.activity_filters, value],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold text-lg">Notification Settings</h1>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* General Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
            <CardDescription>Control what notifications you receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Urgent Broadcasts</p>
                <p className="text-xs text-muted-foreground">
                  Get notified about nearby urgent events
                </p>
              </div>
              <Switch
                checked={preferences.now_broadcasts}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, now_broadcasts: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Event Reminders</p>
                <p className="text-xs text-muted-foreground">
                  Remind me before events I joined start
                </p>
              </div>
              <Switch
                checked={preferences.event_reminders}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, event_reminders: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quiet Hours</CardTitle>
            <CardDescription>No notifications during these hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Start</label>
                <Input
                  type="time"
                  value={preferences.quiet_hours_start}
                  onChange={(e) =>
                    setPreferences((prev) => ({ ...prev, quiet_hours_start: e.target.value }))
                  }
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">End</label>
                <Input
                  type="time"
                  value={preferences.quiet_hours_end}
                  onChange={(e) =>
                    setPreferences((prev) => ({ ...prev, quiet_hours_end: e.target.value }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Notifications</CardTitle>
            <CardDescription>Choose which activities trigger notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ACTIVITY_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center justify-between">
                <p className="text-sm">{option.label}</p>
                <Switch
                  checked={preferences.activity_filters.includes(option.value)}
                  onCheckedChange={() => toggleActivityFilter(option.value)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button className="w-full" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}
