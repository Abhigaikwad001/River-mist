'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const ADMIN_ROLES = [
  'SUPER_ADMIN',
  'BOOKING_MANAGER',
  'EVENT_MANAGER',
  'FINANCE_MANAGER',
  'CONTENT_MANAGER',
];

export default function AdminAuthWrapper({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.replace('/auth/login');
          return;
        }

        const res = await api.get('/users/me');
        const user = res.data;

        if (user && ADMIN_ROLES.includes(user.role)) {
          setIsAuthorized(true);
        } else {
          router.replace('/');
        }
      } catch (error) {
        router.replace('/auth/login');
      }
    };

    verifyAdmin();
  }, [router]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
        <div className="text-[#1E3F20] text-lg font-medium">Verifying access...</div>
      </div>
    );
  }

  return <>{children}</>;
}

