import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, MapPin, Heart, Share2 } from "lucide-react";
import { Link } from "wouter";

interface WelcomeSplashProps {
  onCreateFirstCircle?: () => void;
}

export function WelcomeSplash({ onCreateFirstCircle }: WelcomeSplashProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentUser = useCurrentUser();

  useEffect(() => {
    // Check if this is the user's first visit
    const hasSeenWelcome = localStorage.getItem(`welcome-seen-${currentUser?.id}`);
    
    if (currentUser && !hasSeenWelcome) {
      // Small delay to ensure smooth UI transition
      setTimeout(() => {
        setIsOpen(true);
      }, 500);
    }
  }, [currentUser]);

  const handleSkip = () => {
    if (currentUser) {
      localStorage.setItem(`welcome-seen-${currentUser.id}`, "true");
    }
    setIsOpen(false);
  };

  const handleCreateFirstCircle = () => {
    if (currentUser) {
      localStorage.setItem(`welcome-seen-${currentUser.id}`, "true");
    }
    setIsOpen(false);
    if (onCreateFirstCircle) {
      onCreateFirstCircle();
    }
  };

  if (!currentUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl mb-2">Welcome to Circles!</DialogTitle>
          <DialogDescription className="text-lg">
            Create trusted Circles of friends and discover each other's favorite spots.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 my-6">
          {/* Features showcase */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-2">
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Create Circles</h3>
                <p className="text-sm text-muted-foreground">
                  Organize friends into food-focused groups
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-2">
              <CardContent className="p-4 text-center">
                <MapPin className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Share Restaurants</h3>
                <p className="text-sm text-muted-foreground">
                  Add your favorite spots to Circle lists
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-2">
              <CardContent className="p-4 text-center">
                <Heart className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Get Recommendations</h3>
                <p className="text-sm text-muted-foreground">
                  See what friends love in your area
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-2">
              <CardContent className="p-4 text-center">
                <Share2 className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Share Lists</h3>
                <p className="text-sm text-muted-foreground">
                  Create and share curated restaurant lists
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Quick explanation */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">How it works:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Create a Circle for your friends, family, or colleagues</li>
              <li>Add restaurants you love to your Circle's shared list</li>
              <li>Browse recommendations from trusted friends</li>
              <li>Discover new spots based on people you trust</li>
            </ol>
          </div>
        </div>

        <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button 
            variant="outline" 
            onClick={handleSkip}
            className="w-full sm:w-auto"
          >
            Skip for now
          </Button>
          
          <Link href="/circles" onClick={handleCreateFirstCircle}>
            <Button className="w-full sm:w-auto">
              <Users className="mr-2 h-4 w-4" />
              Create your first Circle
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for tooltips on key labels
export function InfoTooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <div className="relative group inline-flex items-center">
      {children}
      <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg whitespace-nowrap border z-50">
        {content}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover"></div>
      </div>
    </div>
  );
}