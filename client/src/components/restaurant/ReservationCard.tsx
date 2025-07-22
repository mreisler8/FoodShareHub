import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReservationCardProps {
  restaurant: {
    name: string;
    location: string;
  };
}

export default function ReservationCard({ restaurant }: ReservationCardProps) {
  const { toast } = useToast();

  const handleOpenTable = () => {
    const searchQuery = encodeURIComponent(`${restaurant.name} ${restaurant.location}`);
    const openTableUrl = `https://www.opentable.com/s/?text=${searchQuery}`;
    window.open(openTableUrl, '_blank');
    
    toast({
      title: "Opening OpenTable",
      description: "Searching for available reservations"
    });
  };

  const handleResy = () => {
    const searchQuery = encodeURIComponent(`${restaurant.name} ${restaurant.location}`);
    const resyUrl = `https://resy.com/cities/new-york-ny?search=${searchQuery}`;
    window.open(resyUrl, '_blank');
    
    toast({
      title: "Opening Resy",
      description: "Searching for available reservations"
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Make a Reservation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2"
          onClick={handleOpenTable}
        >
          <div className="w-6 h-6 bg-red-600 rounded text-white text-xs flex items-center justify-center font-bold">
            OT
          </div>
          OpenTable
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2"
          onClick={handleResy}
        >
          <div className="w-6 h-6 bg-black rounded text-white text-xs flex items-center justify-center font-bold">
            R
          </div>
          Resy
        </Button>
      </CardContent>
    </Card>
  );
}