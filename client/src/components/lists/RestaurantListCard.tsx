import { Link } from "wouter";
import { RestaurantList } from "@shared/schema";
import { MapPin, Users, Eye, Heart, Star, TrendingUp } from "lucide-react";
import { SaveListButton } from "../SaveListButton";
import { ListAudienceBadge } from "../ListAudienceBadge";

interface RestaurantListCardProps {
  list: RestaurantList;
}

export function RestaurantListCard({ list }: RestaurantListCardProps) {
  return (
    <Link href={`/lists/${list.id}`}>
      <div className="group relative overflow-hidden rounded bg-white border border-neutral-200 hover:border-neutral-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
        {/* Cover Image or Gradient Header */}
        <div className="relative h-24 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
          {list.coverImage ? (
            <img 
              src={list.coverImage} 
              alt={list.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10" />
          )}
          
          {/* Featured/Trending Badge */}
          {(list.isFeatured || list.trending) && (
            <div className="absolute top-3 left-3">
              <div className="flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-amber-700">
                {list.isFeatured ? (
                  <>
                    <Star className="h-3 w-3 fill-current" />
                    Featured
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-3 w-3" />
                    Trending
                  </>
                )}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="absolute top-3 right-3">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <SaveListButton listId={list.id.toString()} userId={list.createdById.toString()} />
            </div>
          </div>
        </div>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-heading font-semibold text-neutral-900 truncate group-hover:text-blue-600 transition-colors">
                  {list.name}
                </h3>
                <ListAudienceBadge audience={list.audience} />
              </div>
              {list.description && (
                <p className="text-neutral-600 text-sm line-clamp-2 leading-relaxed">
                  {list.description}
                </p>
              )}
            </div>
          </div>

          {/* Tags */}
          {list.tags && list.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {list.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-full text-xs font-medium transition-colors"
                >
                  #{tag}
                </span>
              ))}
              {list.tags.length > 3 && (
                <span className="inline-flex items-center px-2.5 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-neutral-600 rounded-full text-xs font-medium">
                  +{list.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
            <div className="flex items-center space-x-4 text-sm text-neutral-500">
              {list.primaryLocation && (
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate max-w-24">{list.primaryLocation}</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span className="capitalize">{list.visibility}</span>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm text-neutral-500">
              <div className="flex items-center space-x-1">
                <Eye className="h-4 w-4" />
                <span>{list.viewCount || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Heart className="h-4 w-4" />
                <span>{list.saveCount || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}