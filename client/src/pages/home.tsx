import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { HeroSection } from "@/components/HeroSection";
import { SectionTabs } from "@/components/home/SectionTabs";
import { PreviewCarousel } from "@/components/home/PreviewCarousel";
import { FeedPreview } from "@/components/home/FeedPreview";
import { RestaurantListsSection } from "@/components/lists/RestaurantListsSection";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Plus, TrendingUp, Star, MapPin, Users } from "lucide-react";
import { Link } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import "./HomePage.css";

// TopPicks component for homepage
function TopPicks() {
  const { data: topPicks, isLoading } = useQuery({
    queryKey: ['/api/top-picks'],
  });

  if (isLoading) {
    return (
      <div className="section-loading">
        Loading top picks...
      </div>
    );
  }

  const restaurants = topPicks?.restaurants || [];
  const posts = topPicks?.posts || [];

  return (
    <div className="picks-grid">
      {restaurants.slice(0, 3).map((restaurant: any) => (
        <Card key={restaurant.id} className="pick-card" hover>
          <div className="pick-card-image" />
          <div className="pick-card-content">
            <h4 className="pick-card-title">{restaurant.name}</h4>
            <div className="pick-card-details">
              <MapPin size={14} />
              <span>{restaurant.location}</span>
              <span>•</span>
              <span>{restaurant.category}</span>
            </div>
            <div className="pick-card-rating">
              <Star size={14} fill="currentColor" />
              <span>{restaurant.averageRating?.toFixed(1) || '4.5'}</span>
              <span>({restaurant.postCount || 0} reviews)</span>
            </div>
          </div>
        </Card>
      ))}

      {posts.slice(0, 2).map((post: any) => (
        <Card key={`post-${post.id}`} className="pick-card" hover>
          <div className="pick-card-image" />
          <div className="pick-card-content">
            <h4 className="pick-card-title">{post.restaurant.name}</h4>
            <div className="pick-card-details">
              <span>by {post.author.name}</span>
              <span>•</span>
              <span>{post.engagement} interactions</span>
            </div>
            <div className="pick-card-rating">
              <Star size={14} fill="currentColor" />
              <span>{post.rating}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('My Lists');

  // Data queries
  const { data: myLists } = useQuery({
    queryKey: ['/api/lists'],
  });

  const { data: topPicks } = useQuery({
    queryKey: ['/api/top-picks'],
  });

  const { data: circles } = useQuery({
    queryKey: ['/api/circles'],
  });

  // Transform data for carousel
  const getCarouselData = () => {
    switch (activeTab) {
      case 'My Lists':
        return (myLists || []).map(list => ({
          id: list.id,
          name: list.name,
          description: list.description,
          category: list.tags?.[0],
          itemCount: list.itemCount || 0,
          type: 'list' as const
        }));

      case 'Top Picks':
        const restaurants = topPicks?.data?.restaurants || [];
        return restaurants.map(restaurant => ({
          id: restaurant.id,
          name: restaurant.name,
          location: restaurant.location,
          category: restaurant.category,
          rating: parseFloat(restaurant.averageRating),
          type: 'restaurant' as const
        }));

      case 'Circles':
        return (circles || []).map(circle => ({
          id: circle.id,
          name: circle.name,
          description: circle.description,
          memberCount: circle.memberCount || 0,
          type: 'circle' as const
        }));

      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />

      <main className="md:ml-56 lg:ml-64">
        <div className="min-h-screen">
          {/* Hero Section */}
          <HeroSection />

          <div className="home-main">
            {/* Main Content with Tabs */}
            <section className="home-section main-content-section">
              <SectionTabs 
                onTabChange={setActiveTab}
                activeTab={activeTab}
              />

              <div className="tab-content">
                <PreviewCarousel 
                  items={getCarouselData()}
                  type={activeTab === 'My Lists' ? 'lists' : 
                       activeTab === 'Top Picks' ? 'restaurants' : 'circles'}
                />
              </div>
            </section>

            {/* Quick Actions */}
            <section className="home-section quick-actions-section">
              <div className="section-header">
                <div>
                  <h2 className="section-title">Quick Actions</h2>
                  <p className="section-subtitle">Create and discover new food communities</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="quick-action-card card-hover" onClick={() => window.location.href = '/circles'}>
                  <div className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <Users className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Create Circle</h3>
                        <p className="text-sm text-gray-600">Start a food community</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Link href="/create-list">
                  <Card className="quick-action-card card-hover">
                    <div className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 p-3 rounded-lg">
                          <Plus className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Create List</h3>
                          <p className="text-sm text-gray-600">Curate restaurants</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </div>
            </section>

            {/* Feed Preview */}
            <section className="home-section feed-section">
              <div className="section-header">
                <div>
                  <h2 className="section-title">Latest Posts</h2>
                  <p className="section-subtitle">Recent dining experiences from your network</p>
                </div>
              </div>
              <FeedPreview maxPosts={2} />
            </section>
          </div>
        </div>
      </main>

      {isMobile && <MobileNavigation />}
    </div>
  );
}