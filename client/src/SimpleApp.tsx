import { useState } from 'react';
import AddListItemModal from './components/lists/AddListItemModal';

console.log('🚀 SimpleApp loading...');

function SimpleApp() {
  console.log('🚀 SimpleApp rendering...');
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-8">
          Circles - Restaurant Search
        </h1>
        
        <button 
          onClick={() => setShowModal(true)}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Test Restaurant Search
        </button>

        {showModal && (
          <AddListItemModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onAddItems={() => {
              console.log('Items added successfully');
              setShowModal(false);
            }}
            listId={1}
          />
        )}
      </div>
    </div>
  );
}

export default SimpleApp;