import { useState } from 'react';
import { Search, MapPin, Star } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PostModal } from '@/components/post/PostModal';
import { useRestaurantSearch } from '@/hooks/useRestaurantSearch';
import './QuickAddPanel.css';

interface Restaurant {
  id: number;
  name: string;
  location: string;
  category: string;
  priceRange: string;
  imageUrl?: string;
}

export function QuickAddPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const { restaurants, isLoading } = useRestaurantSearch(searchTerm);

  const handleRestaurantSelect = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setSearchTerm(restaurant.name);
    setShowResults(false);
    setIsPostModalOpen(true);
  };

  const handleSearchFocus = () => {
    if (searchTerm.length > 0) {
      setShowResults(true);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setShowResults(value.length > 0);
  };

  return (
    <>
      <Card className="quick-add-panel" variant="elevated" padding="lg">
        <div className="quick-add-header">
          <h3 className="quick-add-title">Quick Post</h3>
          <p className="quick-add-subtitle">Share your dining experience instantly</p>
        </div>

        <div className="quick-add-search">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search restaurants..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={handleSearchFocus}
              className="search-input"
            />
          </div>

          {showResults && (
            <div className="search-results">
              {isLoading ? (
                <div className="search-loading">Searching...</div>
              ) : restaurants.length > 0 ? (
                restaurants.slice(0, 5).map((restaurant) => (
                  <button
                    key={restaurant.id}
                    className="search-result-item"
                    onClick={() => handleRestaurantSelect(restaurant)}
                  >
                    <div className="result-main">
                      <div className="result-name">{restaurant.name}</div>
                      <div className="result-details">
                        <MapPin size={14} className="result-icon" />
                        <span>{restaurant.location}</span>
                        <span className="result-separator">•</span>
                        <span>{restaurant.category}</span>
                        <span className="result-separator">•</span>
                        <span>{restaurant.priceRange}</span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="search-no-results">
                  No restaurants found. Try a different search term.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="quick-add-actions">
          <Button
            variant="outline"
            size="md"
            onClick={() => setIsPostModalOpen(true)}
            className="quick-add-btn"
          >
            <Star className="mr-2 h-4 w-4" />
            Write Review
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsPostModalOpen(true)}
            className="quick-add-btn"
            disabled={!selectedRestaurant && searchTerm.length === 0}
          >
            Create Post
          </Button>
        </div>
      </Card>

      <PostModal
        open={isPostModalOpen}
        onOpenChange={(open) => {
          setIsPostModalOpen(open);
          if (!open) setSelectedRestaurant(null);
        }}
      />
    </>
  );
}