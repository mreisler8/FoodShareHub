import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, UtensilsCrossed } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrderOptionsCardProps {
  restaurant: {
    name: string;
    location: string;
    website?: string;
  };
  menuUrl?: string;
  orderUrl?: string;
}

export default function OrderOptionsCard({ restaurant, menuUrl, orderUrl }: OrderOptionsCardProps) {
  const { toast } = useToast();

  const handleViewMenu = () => {
    const targetUrl = menuUrl || restaurant.website;
    if (targetUrl) {
      window.open(targetUrl, '_blank');
      toast({
        title: "Opening Menu",
        description: "Viewing restaurant menu"
      });
    } else {
      // Fallback to Google search for menu
      const searchQuery = encodeURIComponent(`${restaurant.name} ${restaurant.location} menu`);
      window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
      toast({
        title: "Searching for Menu",
        description: "Looking for menu online"
      });
    }
  };

  const handleOrderOnline = () => {
    if (orderUrl) {
      window.open(orderUrl, '_blank');
      toast({
        title: "Opening Order Platform",
        description: "Redirecting to online ordering"
      });
    } else {
      // Fallback to Uber Eats search
      const searchQuery = encodeURIComponent(`${restaurant.name} ${restaurant.location}`);
      window.open(`https://www.ubereats.com/ca/search?q=${searchQuery}`, '_blank');
      toast({
        title: "Searching for Delivery",
        description: "Looking for delivery options"
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5" />
          View Menu & Order
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2"
          onClick={handleViewMenu}
        >
          <ExternalLink className="h-4 w-4" />
          View Menu
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2"
          onClick={handleOrderOnline}
        >
          <ExternalLink className="h-4 w-4" />
          Order Online
        </Button>
      </CardContent>
    </Card>
  );
}