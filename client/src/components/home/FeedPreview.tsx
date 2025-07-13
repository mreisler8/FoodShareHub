
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PostCard } from './PostCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import './FeedPreview.css';

interface FeedPreviewProps {
  maxPosts?: number;
}

export function FeedPreview({ maxPosts = 2 }: FeedPreviewProps) {
  const { data: feedData, isLoading, error } = useQuery({
    queryKey: ['/api/feed'],
  });

  if (isLoading) {
    return (
      <div className="feed-preview">
        <div className="feed-preview-loading">
          {Array.from({ length: maxPosts }).map((_, i) => (
            <div key={i} className="feed-preview-skeleton">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-16 w-full mb-3" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feed-preview-error">
        <p>Failed to load recent posts</p>
      </div>
    );
  }

  const posts = feedData?.posts || [];
  const previewPosts = posts.slice(0, maxPosts);

  if (previewPosts.length === 0) {
    return (
      <div className="feed-preview-empty">
        <p>No recent posts from your network</p>
        <Link href="/discover">
          <Button variant="outline" size="sm">
            Discover People
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="feed-preview">
      <div className="feed-preview-posts">
        {previewPosts.map((post) => (
          <div key={post.id} className="feed-preview-post">
            <PostCard post={post} isCompact={true} />
          </div>
        ))}
      </div>
      
      <div className="feed-preview-footer">
        <Link href="/feed">
          <Button variant="outline" className="load-more-button">
            View Full Feed
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
