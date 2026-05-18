import React from 'react';
import AuthGuard from '@/components/auth/AuthGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    // Pura admin section ab secure hai!
    <AuthGuard>
      {children}
    </AuthGuard>
  );
}