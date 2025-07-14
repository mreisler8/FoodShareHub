import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { CreateListForm } from "@/components/CreateListForm";
import { queryClient } from "@/lib/queryClient";

interface CreateRankListModalProps {
  children?: React.ReactNode;
  className?: string;
}

export function CreateRankListModal({ children, className }: CreateRankListModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = () => {
    // Invalidate queries to refresh the lists
    queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
    queryClient.invalidateQueries({ queryKey: ['/api/me/lists'] });
    queryClient.invalidateQueries({ queryKey: ['/api/restaurant-lists'] });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className={className}>
            <Plus className="h-4 w-4 mr-2" />
            Create & Rank List
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <CreateListForm onClose={() => setIsOpen(false)} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}