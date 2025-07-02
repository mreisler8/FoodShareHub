import { useState } from 'react';
import { CreateListModal } from './lists/CreateListModal';
import { RestaurantListsSection } from './lists/RestaurantListsSection';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { MobileNavigation } from './navigation/MobileNavigation';
import { DesktopSidebar } from './navigation/DesktopSidebar';

export default function Lists() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6 pb-20 md:pb-6">
          {/* Header with Create Button */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Restaurant Lists</h1>
              <p className="text-muted-foreground mt-1">Create and manage your curated restaurant collections</p>
            </div>
            
            <Button 
              onClick={() => setShowCreate(true)} 
              className="flex items-center gap-2"
              size="lg"
            >
              <PlusCircle className="h-5 w-5" />
              Create List
            </Button>
          </div>

          {/* Lists Section */}
          <RestaurantListsSection 
            title="Your Lists"
            showCreateButton={false} // We're handling the create button in header
          />
        </div>
      </div>

      <MobileNavigation />
      
      {/* Mobile Floating Action Button */}
      <div className="md:hidden fixed bottom-20 right-4 z-40">
        <Button 
          onClick={() => setShowCreate(true)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg"
          aria-label="Create new restaurant list"
        >
          <PlusCircle className="h-6 w-6" />
        </Button>
      </div>
      
      {/* Create List Modal */}
      <CreateListModal 
        open={showCreate} 
        onOpenChange={setShowCreate} 
      />
    </div>
  );
}