

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-100">
      
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
