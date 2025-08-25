import { SocialNetworkDashboard } from '@/components/social/SocialNetworkDashboard';
import { useAuth } from '@/hooks/use-auth';
import { useEffect } from 'react';

export default function SocialDashboardPage() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = '/auth';
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access the social network dashboard.</p>
        </div>
      </div>
    );
  }

  return <SocialNetworkDashboard />;
}