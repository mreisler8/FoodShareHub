import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UserCircle2, Users, MapPin, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState<string>("welcome");
  const { user } = useAuth();

  // Force close function that will be called if normal close fails
  const forceClose = () => {
    console.log("Force closing onboarding modal");
    if (user?.id) {
      localStorage.setItem(`onboarding-completed-${user.id}`, 'true');
    }
    onClose();
  };

  const handleComplete = () => {
    // Save the onboarding completion to localStorage
    if (user?.id) {
      localStorage.setItem(`onboarding-completed-${user.id}`, 'true');
    }
    console.log("Completing onboarding");
    onClose();
  };

  // Handle dialog close event
  const handleOpenChange = (open: boolean) => {
    if (!open && user?.id) {
      // Save completed state when closing the dialog
      localStorage.setItem(`onboarding-completed-${user.id}`, 'true');
    }
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex justify-end">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 absolute top-2 right-2"
              onClick={forceClose}
              aria-label="Close"
            >
              ✕
            </Button>
          </div>
          <DialogTitle className="text-center text-2xl">
            Welcome to Circles!
          </DialogTitle>
          <DialogDescription className="text-center">
            Let's get you started with a few quick steps
          </DialogDescription>
        </DialogHeader>

        <Tabs value={step} onValueChange={setStep} className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="welcome">
              <UserCircle2 className="h-4 w-4" />
              <span className="sr-only">Welcome</span>
            </TabsTrigger>
            <TabsTrigger value="circles">
              <Users className="h-4 w-4" />
              <span className="sr-only">Circles</span>
            </TabsTrigger>
            <TabsTrigger value="discover">
              <MapPin className="h-4 w-4" />
              <span className="sr-only">Discover</span>
            </TabsTrigger>
            <TabsTrigger value="sharing">
              <MessageCircle className="h-4 w-4" />
              <span className="sr-only">Sharing</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="welcome" className="space-y-4 py-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCircle2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="text-lg text-center font-semibold">
              Welcome, {user?.name || "Friend"}!
            </h3>
            <p className="text-center text-muted-foreground">
              Circles is built around trusted restaurant recommendations from people you know.
              No more anonymous reviews—just real advice from friends.
            </p>
            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep("circles")}>Next</Button>
            </div>
          </TabsContent>

          <TabsContent value="circles" className="space-y-4 py-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="text-lg text-center font-semibold">Join or Create Circles</h3>
            <p className="text-center text-muted-foreground">
              Circles are groups of friends or like-minded food enthusiasts. Join existing ones or create
              your own to share restaurant recommendations with people you trust.
            </p>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("welcome")}>
                Back
              </Button>
              <Button onClick={() => setStep("discover")}>Next</Button>
            </div>
          </TabsContent>

          <TabsContent value="discover" className="space-y-4 py-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="text-lg text-center font-semibold">Discover Restaurants</h3>
            <p className="text-center text-muted-foreground">
              Browse restaurant lists created by your circles. Find places by location, cuisine type,
              or through trusted recommendations from your network.
            </p>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("circles")}>
                Back
              </Button>
              <Button onClick={() => setStep("sharing")}>Next</Button>
            </div>
          </TabsContent>

          <TabsContent value="sharing" className="space-y-4 py-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="text-lg text-center font-semibold">Share Your Experiences</h3>
            <p className="text-center text-muted-foreground">
              Create your own lists, post reviews, and share your favorite dining spots with your circles.
              Your recommendations help others discover great places to eat!
            </p>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("discover")}>
                Back
              </Button>
              <Button onClick={forceClose} className="bg-primary hover:bg-primary/90">
                Skip & Get Started
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}