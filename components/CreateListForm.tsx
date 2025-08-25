import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ShareToDestinationDropdown } from "@/components/circles/ShareToDestinationDropdown";

export function CreateListForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shareDestination, setShareDestination] = useState<{
    visibility: 'private' | 'public' | 'circle';
    circleId?: number;
  }>({ visibility: 'private' });

  return (
    <div>
      <Input
        type="text"
        placeholder="List Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Textarea
        placeholder="What makes this list special?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <ShareToDestinationDropdown
        value={shareDestination}
        onChange={setShareDestination}
      />
      <Button
        onClick={async () => {
          const payload = {
            name,
            description,
            type: "restaurant",
            audience: shareDestination.visibility,
            visibility: {
              public: shareDestination.visibility === 'public',
              followers: false,
              circleIds: shareDestination.circleId ? [shareDestination.circleId] : []
            },
            circleId: shareDestination.circleId || null,
            shareWithCircle: shareDestination.visibility === 'circle',
            makePublic: shareDestination.visibility === 'public'
          };
          console.log(payload);
          onClose();
        }}
      >
        Create List
      </Button>
    </div>
  );
}