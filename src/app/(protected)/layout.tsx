import { BottomNav } from '@/components/BottomNav';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <main className="pb-12 max-w-2xl mx-auto w-full">
        {children}
      </main>
      <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200">
        <div className="max-w-2xl mx-auto">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
