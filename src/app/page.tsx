import Link from 'next/link';
import { MapPin, Zap, MessageCircle, Star, Map, Users, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: Map,
    title: 'Map Discovery',
    description: 'Browse nearby events on an interactive map. See what\'s happening around you in real time.',
    color: 'bg-indigo-100 text-indigo-600',
  },
  {
    icon: Zap,
    title: 'Urgent Mode',
    description: 'Urgent events pulse on the map and broadcast to nearby users. Rally people in minutes.',
    color: 'bg-pink-100 text-pink-600',
  },
  {
    icon: MessageCircle,
    title: 'Real-time Chat',
    description: 'Coordinate with participants instantly. Plan meetup details, share updates, stay connected.',
    color: 'bg-violet-100 text-violet-600',
  },
  {
    icon: Star,
    title: 'Auto-Match',
    description: 'Set your schedule once. We automatically find nearby people who are free at the same time.',
    color: 'bg-amber-100 text-amber-600',
  },
];

const STEPS = [
  { number: 1, title: 'Create an Event', description: 'Pin an activity on the map — basketball, study session, coffee, anything.', color: 'from-indigo-500 to-violet-500' },
  { number: 2, title: 'People Discover It', description: 'Nearby users see your event on the map and get notified if it\'s urgent.', color: 'from-violet-500 to-purple-500' },
  { number: 3, title: 'Rally Together', description: 'Participants join, chat to coordinate, and show up. That\'s it.', color: 'from-purple-500 to-pink-500' },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen mesh-gradient">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl" />

        <div className="relative animate-fade-in">
          <div className="flex items-center gap-3 mb-4 justify-center">
            <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
              <MapPin className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl text-gradient">Rally</h1>
          </div>
          <p className="max-w-lg text-lg text-muted-foreground leading-relaxed mx-auto">
            Find nearby people who want to do the same activity right now. No groups to join, no posts to scroll — just broadcast your intent and find your people.
          </p>
        </div>

        <div className="relative animate-fade-in-up delay-200 flex flex-col sm:flex-row gap-3">
          <Link
            href="/login"
            className="btn-gradient inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 animate-fade-in">Everything you need to rally</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-md mx-auto">Discover, create, and join spontaneous activities happening near you right now.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={cn(
                    'card-hover rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-100 p-6 shadow-sm animate-fade-in-up',
                    i === 0 && 'delay-100',
                    i === 1 && 'delay-200',
                    i === 2 && 'delay-300',
                    i === 3 && 'delay-400',
                  )}
                >
                  <div className={cn('inline-flex items-center justify-center h-12 w-12 rounded-xl mb-4', feature.color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 bg-gray-50/80">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How it works</h2>
          <p className="text-center text-muted-foreground mb-14">Three steps to your next spontaneous adventure.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {STEPS.map((step) => (
              <div key={step.number} className="flex flex-col items-center text-center gap-4">
                <div className={cn(
                  'flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br text-white font-bold text-lg shadow-lg',
                  step.color
                )}>
                  {step.number}
                </div>
                <h3 className="font-semibold text-lg">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
        <div className="relative max-w-lg mx-auto flex flex-col items-center gap-5">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">Ready to find your people?</h2>
          <p className="text-white/80 leading-relaxed">Join Rally and start discovering spontaneous activities near you.</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-indigo-600 shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all mt-2"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>Built for the moment. Rally © {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
