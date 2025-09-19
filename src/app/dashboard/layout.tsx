import AuthGuard from '@/components/AuthGuard';
import BanStatusIndicator from '@/components/BanStatusIndicator';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requireAuth={true}>
      <BanStatusIndicator />
      {children}
    </AuthGuard>
  );
}
