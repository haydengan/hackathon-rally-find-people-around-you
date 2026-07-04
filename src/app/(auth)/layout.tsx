export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Mesh gradient overlay */}
      <div className="absolute inset-0 mesh-gradient" />
      {/* Decorative background blobs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-100/20 rounded-full blur-3xl" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
