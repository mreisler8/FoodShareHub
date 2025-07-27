import React from 'react';
import { VisualFoodMoment } from '../components/create/VisualFoodMoment';
import { useLocation } from 'wouter';
import { useAuth } from '../hooks/use-auth';

export function CreateMomentPage() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();

  // Redirect to auth if not authenticated
  React.useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-semibold text-center">Create Food Moment</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto p-4">
        <VisualFoodMoment
          onSuccess={() => navigate('/feed')}
          onCancel={() => navigate('/feed')}
        />
      </div>
    </div>
  );
}