
import { SaveListButton } from "../SaveListButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Star, Clock, Users } from "lucide-react";

interface ListItem {
  name: string;
  notes?: string;
  tags?: string[];
  city?: string;
  mediaUrl?: string;
  rank?: number;
  rating?: number;
  priceAssessment?: string;
  liked?: string;
  disliked?: string;
  mustTryDishes?: string[];
}

interface ListDetailsProps {
  list: {
    id: string;
    title: string;
    creator: string;
    cuisine?: string;
    city?: string;
    cover_image?: string;
    description?: string;
    type?: string;
    items: ListItem[];
    viewCount?: number;
    saveCount?: number;
    createdAt?: string;
  };
  userId: string;
}

export function ListDetails({ list, userId }: ListDetailsProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div className="space-y-3 flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{list.title}</h1>
          
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="font-medium">By @{list.creator}</span>
            {list.cuisine && (
              <>
                <span>·</span>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                  {list.cuisine}
                </Badge>
              </>
            )}
            {list.city && (
              <>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{list.city}</span>
                </div>
              </>
            )}
            {list.createdAt && (
              <>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(list.createdAt)}</span>
                </div>
              </>
            )}
          </div>

          {list.description && (
            <p className="text-gray-700 max-w-2xl leading-relaxed">{list.description}</p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>{list.saveCount || 0} saves</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Star className="w-4 h-4" />
              <span>{list.viewCount || 0} views</span>
            </div>
          </div>
        </div>
        
        <div className="ml-6">
          <SaveListButton listId={list.id} userId={userId} />
        </div>
      </div>

      {/* Cover Image */}
      {list.cover_image && (
        <div className="w-full">
          <img
            src={list.cover_image}
            alt={`${list.title} cover`}
            className="w-full h-80 object-cover rounded-xl shadow-lg"
          />
        </div>
      )}

      {/* List Items */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {list.type === 'dish' ? 'Dishes' : 'Places'} ({list.items.length})
          </h2>
          {list.items.length > 0 && (
            <Badge variant="outline" className="text-sm">
              {list.type === 'dish' ? 'Ranked List' : 'Restaurant List'}
            </Badge>
          )}
        </div>
        
        <div className="grid gap-6">
          {list.items.map((item, i) => (
            <Card key={i} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Item Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-xl flex items-center gap-3">
                        {item.rank && (
                          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                            #{item.rank}
                          </span>
                        )}
                        {item.name}
                      </h3>
                      
                      {/* Rating and Price Assessment */}
                      <div className="flex items-center gap-4 mt-2">
                        {item.rating && (
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < item.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="text-sm text-gray-600 ml-1">({item.rating}/5)</span>
                          </div>
                        )}
                        
                        {item.priceAssessment && (
                          <Badge 
                            variant={
                              item.priceAssessment === 'Great value' ? 'default' :
                              item.priceAssessment === 'Fair' ? 'secondary' : 'destructive'
                            }
                            className="text-xs"
                          >
                            {item.priceAssessment}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {item.city && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {item.city}
                      </Badge>
                    )}
                  </div>

                  {/* Item Notes */}
                  {item.notes && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700 text-sm leading-relaxed italic">
                        "{item.notes}"
                      </p>
                    </div>
                  )}

                  {/* What I Liked/Disliked */}
                  {(item.liked || item.disliked) && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {item.liked && (
                        <div className="bg-green-50 p-3 rounded-lg">
                          <h4 className="font-semibold text-green-800 text-sm mb-1">What I Loved</h4>
                          <p className="text-green-700 text-sm">{item.liked}</p>
                        </div>
                      )}
                      {item.disliked && (
                        <div className="bg-red-50 p-3 rounded-lg">
                          <h4 className="font-semibold text-red-800 text-sm mb-1">What Could Be Better</h4>
                          <p className="text-red-700 text-sm">{item.disliked}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Must Try Dishes */}
                  {item.mustTryDishes && item.mustTryDishes.length > 0 && (
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-amber-800 text-sm mb-2">Must Try Dishes</h4>
                      <div className="flex flex-wrap gap-2">
                        {item.mustTryDishes.map((dish, dishIndex) => (
                          <Badge key={dishIndex} variant="secondary" className="bg-amber-100 text-amber-800">
                            {dish}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Item Media */}
                  {item.mediaUrl && (
                    <div className="w-full">
                      <img
                        src={item.mediaUrl}
                        alt={item.name}
                        className="w-full h-64 object-cover rounded-lg shadow-sm"
                      />
                    </div>
                  )}

                  {/* Item Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {list.items.length === 0 && (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Users className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No items yet</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            This list is just getting started. Check back soon for some great {list.type === 'dish' ? 'dish' : 'restaurant'} recommendations!
          </p>
        </div>
      )}
    </div>
  );
}
