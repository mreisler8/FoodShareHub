import { Users, UserCheck, Star, Bookmark, Heart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

interface ProfileStatsProps {
  userId: number;
  layout?: 'vertical' | 'horizontal';
  showLabels?: boolean;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
}

export function ProfileStats({ 
  userId, 
  layout = 'vertical', 
  showLabels = false,
  onFollowersClick, 
  onFollowingClick 
}: ProfileStatsProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: [`/api/users/${userId}/stats`],
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className={`flex ${layout === 'horizontal' ? 'flex-row gap-6' : 'flex-col gap-2'}`}>
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-12"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statItems = [
    {
      label: 'Reviews',
      value: stats.reviewCount || 0,
      icon: Star,
      onClick: undefined,
    },
    {
      label: 'Lists',
      value: stats.listCount || 0,
      icon: Bookmark,
      onClick: undefined,
    },
    {
      label: 'Circles',
      value: stats.circleCount || 0,
      icon: Users,
      onClick: undefined,
    },
    {
      label: 'Followers',
      value: stats.followers || 0,
      icon: UserCheck,
      onClick: onFollowersClick,
    },
    {
      label: 'Following',
      value: stats.following || 0,
      icon: Users,
      onClick: onFollowingClick,
    },
  ];

  const containerClass = layout === 'horizontal' 
    ? 'flex flex-row gap-6 md:gap-8' 
    : 'flex flex-col gap-2';

  return (
    <div className={containerClass}>
      {statItems.map(({ label, value, icon: Icon, onClick }) => (
        <div
          key={label}
          className={`${onClick ? 'cursor-pointer hover:text-primary' : ''} ${
            layout === 'horizontal' ? 'text-center' : 'flex items-center gap-2'
          }`}
          onClick={onClick}
        >
          {layout === 'horizontal' ? (
            <div>
              <div className="font-bold text-lg">{value.toLocaleString()}</div>
              {showLabels && (
                <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                  <Icon className="h-3 w-3" />
                  {label}
                </div>
              )}
            </div>
          ) : (
            <>
              <Icon className="h-4 w-4 text-gray-500" />
              <span className="font-semibold">{value.toLocaleString()}</span>
              <span className="text-gray-500">{label}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}