import { useState } from 'react';
import { CreateListModal } from './lists/CreateListModal';
import { RestaurantListsSection } from './lists/RestaurantListsSection';

export default function Lists() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <button onClick={() => setShowCreate(true)} className="btn btn-primary">
        + Create List
      </button>

      {showCreate && (
        <CreateListModal 
          open={showCreate} 
          onOpenChange={setShowCreate} 
        />
      )}

      {/* existing lists UI goes here */}
      <RestaurantListsSection 
        title="My Lists"
        showCreateButton={false} // We're handling the create button above
      />
    </>
  );
}