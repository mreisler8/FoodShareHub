import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TriedItButton, RecCreditBadge } from '@/components/recommendations';

/**
 * Example showing how to integrate the Accept Recommendation system
 * into list item cards for tracking recommendation conversions
 */
export function ListItemCardExample() {
  const exampleListItem = {
    id: 1,
    restaurantId: 123,
    restaurantName: "Golden Dragon",
    recommenderUserId: 8, // Jason Bloom's user ID
    recommenderName: "Jason Bloom",
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{exampleListItem.restaurantName}</span>
          <RecCreditBadge 
            userId={exampleListItem.recommenderUserId}
            size="sm"
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            A highly-rated restaurant recommended by {exampleListItem.recommenderName}
          </p>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              Have you tried this place?
            </span>
            
            <TriedItButton
              entityType="list"
              entityId={exampleListItem.id}
              restaurantId={exampleListItem.restaurantId}
              recommenderUserId={exampleListItem.recommenderUserId}
              sourceContext="list_item_card"
              size="sm"
              variant="outline"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}