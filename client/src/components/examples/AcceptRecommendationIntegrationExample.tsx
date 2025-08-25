import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TriedItButton, RecCreditBadge } from '@/components/recommendations';

/**
 * Complete example showing the Accept Recommendation system integrated 
 * across all major touchpoints in the application
 */
export function AcceptRecommendationIntegrationExample() {
  const exampleData = {
    recommenderUserId: 8, // Jason Bloom
    recommenderName: "Jason Bloom",
    restaurantId: 123,
    restaurantName: "Golden Dragon",
    listId: 45,
    listName: "Best Asian Food"
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Accept Recommendation System</h2>
        <p className="text-gray-600">Complete integration across all recommendation touchpoints</p>
      </div>

      {/* 1. Restaurant List Item Card Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>1. Restaurant List Integration</span>
            <Badge variant="secondary">ListItemCard</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{exampleData.restaurantName}</h3>
              <p className="text-sm text-gray-600">
                Added to "{exampleData.listName}" by <RecCreditBadge userId={exampleData.recommenderUserId} size="xs" />
              </p>
            </div>
            <TriedItButton
              entityType="list"
              entityId={exampleData.listId}
              restaurantId={exampleData.restaurantId}
              recommenderUserId={exampleData.recommenderUserId}
              sourceContext="list_item_card"
              size="sm"
              variant="ghost"
            />
          </div>
          <p className="text-xs text-gray-500">
            📍 Appears next to every restaurant in lists when added by someone else
          </p>
        </CardContent>
      </Card>

      {/* 2. Restaurant Action Bar Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>2. Restaurant Detail Page</span>
            <Badge variant="secondary">RestaurantActionBar</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 border rounded-md text-sm">Save</button>
            <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Quick Rate</button>
            <TriedItButton
              entityType="rating"
              entityId={789}
              restaurantId={exampleData.restaurantId}
              recommenderUserId={exampleData.recommenderUserId}
              sourceContext="restaurant_action_bar_desktop"
              size="default"
              variant="outline"
            />
            <button className="px-3 py-2 border rounded-md text-sm">Add to List</button>
          </div>
          <p className="text-xs text-gray-500">
            📍 Appears in action bar when restaurant page accessed via recommendation
          </p>
        </CardContent>
      </Card>

      {/* 3. Search Results Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>3. Search Results</span>
            <Badge variant="secondary">SearchResultsList</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
              <div>
                <h3 className="font-medium">{exampleData.restaurantName}</h3>
                <p className="text-sm text-gray-600">Asian Cuisine • $$</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 text-sm">⭐</button>
              <TriedItButton
                entityType="post"
                entityId={456}
                restaurantId={exampleData.restaurantId}
                recommenderUserId={exampleData.recommenderUserId}
                sourceContext="search_results"
                size="sm"
                variant="ghost"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            📍 Appears when search results include recommended restaurants
          </p>
        </CardContent>
      </Card>

      {/* 4. Analytics & Conversion Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>4. Analytics Foundation</span>
            <Badge variant="outline">Backend Tracking</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Source Tracking:</strong>
              <ul className="text-xs text-gray-600 mt-1 space-y-1">
                <li>• list_item_card</li>
                <li>• restaurant_action_bar_mobile</li>
                <li>• restaurant_action_bar_desktop</li>
                <li>• search_results</li>
              </ul>
            </div>
            <div>
              <strong>Conversion Funnel:</strong>
              <ul className="text-xs text-gray-600 mt-1 space-y-1">
                <li>• View recommendation ✓</li>
                <li>• Click "Tried It" ✓</li>
                <li>• Rate experience ✓</li>
                <li>• Trust score updated ✓</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            📊 Complete analytics pipeline tracks recommendation effectiveness for Circle Score algorithm
          </p>
        </CardContent>
      </Card>

      <div className="text-center p-4 bg-green-50 rounded-lg">
        <h3 className="font-medium text-green-800 mb-2">✅ Implementation Complete</h3>
        <p className="text-sm text-green-700">
          Accept Recommendation system is now operational across all major touchpoints.
          Users can track their recommendation experiences, and the platform gains
          valuable analytics for improving trust-based algorithms.
        </p>
      </div>
    </div>
  );
}