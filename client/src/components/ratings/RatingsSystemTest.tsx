import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuickRateModal } from '@/components/ratings/QuickRateModal';
import { CircleScorePrivacyModal } from '@/components/settings/CircleScorePrivacyModal';
import { TestRestaurantData } from '@/components/mvp/MVPComprehensiveFixes';
import { Settings, Star, Shield, TestTube } from 'lucide-react';

export const RatingsSystemTest: React.FC = () => {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const testRestaurant = TestRestaurantData.restaurant;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-blue-600" />
            Restaurant Ratings System Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button 
              onClick={() => setShowRatingModal(true)}
              className="flex items-center gap-2"
            >
              <Star className="h-4 w-4" />
              Test Rating Modal
            </Button>
            
            <Button 
              onClick={() => setShowPrivacyModal(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Test Privacy Controls
            </Button>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Test Features:</h3>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>✓ Data integrity validation (restaurant ID checks)</li>
              <li>✓ Accessibility (ARIA labels, keyboard navigation)</li>
              <li>✓ Abuse prevention (rate limits, duplicate blocks)</li>
              <li>✓ Rating context (0.1-10.0 scale, update rules)</li>
              <li>✓ User feedback (Circle Score impact alerts)</li>
              <li>✓ Circle Score privacy controls</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <QuickRateModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        restaurant={testRestaurant}
      />

      <CircleScorePrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </div>
  );
};