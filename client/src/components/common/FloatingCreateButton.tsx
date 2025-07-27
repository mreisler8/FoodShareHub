
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedShareModal } from "@/components/share/UnifiedShareModal";

interface FloatingCreateButtonProps {
  className?: string;
}

export function FloatingCreateButton({ className }: FloatingCreateButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        size="lg"
        className="fixed bottom-24 right-4 h-16 w-16 rounded-full bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 border-4 border-white relative overflow-hidden"
        style={{ zIndex: 10000 }}
        aria-label="Create new content"
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
        <Plus className="h-7 w-7 text-white relative z-10" />
      </Button>

      <UnifiedShareModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  );
}
