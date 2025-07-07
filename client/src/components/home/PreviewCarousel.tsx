
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Users } from 'lucide-react';
import './PreviewCarousel.css';

interface CarouselItem {
  id: number;
  name: string;
  category?: string;
  location?: string;
  image?: string;
  rating?: number;
  type: 'restaurant' | 'list' | 'circle';
  description?: string;
  memberCount?: number;
  itemCount?: number;
}

interface PreviewCarouselProps {
  items: CarouselItem[];
  type: 'restaurants' | 'lists' | 'circles';
}

export function PreviewCarousel({ items, type }: PreviewCarouselProps) {
  if (!items || items.length === 0) {
    return (
      <div className="carousel-empty">
        <p className="text-gray-500">No {type} found</p>
      </div>
    );
  }

  return (
    <div className="preview-carousel">
      <div className="carousel-container">
        {items.slice(0, 3).map((item) => (
          <Card key={item.id} className="carousel-item" hover={true}>
            <div className="carousel-item-image">
              {item.image ? (
                <img src={item.image} alt={item.name} />
              ) : (
                <div className="placeholder-image">
                  {type === 'restaurants' && <MapPin size={24} />}
                  {type === 'lists' && <Star size={24} />}
                  {type === 'circles' && <Users size={24} />}
                </div>
              )}
            </div>
            <div className="carousel-item-content">
              <h3 className="carousel-item-title">{item.name}</h3>
              <div className="carousel-item-meta">
                {item.category && <Badge variant="secondary">{item.category}</Badge>}
                {item.location && (
                  <div className="carousel-item-location">
                    <MapPin size={12} />
                    <span>{item.location}</span>
                  </div>
                )}
                {item.rating && (
                  <div className="carousel-item-rating">
                    <Star size={12} fill="currentColor" />
                    <span>{item.rating}</span>
                  </div>
                )}
                {item.memberCount && (
                  <div className="carousel-item-members">
                    <Users size={12} />
                    <span>{item.memberCount} members</span>
                  </div>
                )}
                {item.itemCount && (
                  <div className="carousel-item-count">
                    <span>{item.itemCount} items</span>
                  </div>
                )}
              </div>
              {item.description && (
                <p className="carousel-item-description">{item.description}</p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
