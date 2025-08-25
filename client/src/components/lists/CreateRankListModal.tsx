import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CreateListForm } from "@/components/CreateListForm";

interface CreateRankListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (listId: number) => void;
}

export function CreateRankListModal({ isOpen, onClose, onSuccess }: CreateRankListModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
        <CreateListForm onClose={onClose} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}