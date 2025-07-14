import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { HeroSection } from "@/components/HeroSection";
import { QuickAddPanel } from "@/components/QuickAddPanel";
import { FeedSection } from "@/components/home/FeedSection";
import { MyLists } from "@/components/home/MyLists";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Plus, TrendingUp, Star, MapPin, Users } from "lucide-react";
import { Link } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
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

  return (
    <div className="flex min-h-screen bg-gray-50">
      {!isMobile && <DesktopSidebar />}
      
      <main className="flex-1">
        <div className="home-page">
          {/* Hero Section */}
          <HeroSection />
          
          <div className="home-main">
            {/* Quick Add Panel */}
            <QuickAddPanel />
            
            {/* My Lists Section */}
            <section className="home-section my-lists-section">
              <div className="section-header">
                <div>
                  <h2 className="section-title">My Lists</h2>
                  <p className="section-subtitle">Your curated restaurant collections</p>
                </div>
                <div className="section-action">
                  <Link href="/lists/new">
                    <Button variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      New List
                    </Button>
                  </Link>
                </div>
              </div>
              <MyLists />
            </section>

            {/* Top Picks Section */}
            <section className="home-section top-picks-section">
              <div className="section-header">
                <div>
                  <h2 className="section-title">Top Picks</h2>
                  <p className="section-subtitle">Trending restaurants and reviews</p>
                </div>
                <div className="section-action">
                  <Link href="/top-picks">
                    <Button variant="outline" size="sm">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      View All
                    </Button>
                  </Link>
                </div>
              </div>
              <TopPicks />
            </section>

            {/* Feed Section */}
            <section className="home-section feed-section">
              <div className="section-header">
                <div>
                  <h2 className="section-title">Latest Posts</h2>
                  <p className="section-subtitle">Recent dining experiences from your network</p>
                </div>
                <div className="section-action">
                  <Link href="/feed">
                    <Button variant="outline" size="sm">
                      <Users className="mr-2 h-4 w-4" />
                      Full Feed
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="feed-grid">
                <FeedSection />
              </div>
            </section>
          </div>
        </div>
      </main>
      
      {isMobile && <MobileNavigation />}
    </div>
  );
}