import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { X, ArrowLeft, ArrowRight } from "lucide-react";

interface SimpleCircleWizardProps {
  onClose: () => void;
}

export function SimpleCircleWizard({ onClose }: SimpleCircleWizardProps) {
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form data
  const [circleName, setCircleName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [allowPublicJoin, setAllowPublicJoin] = useState(false);

  const handleCreateCircle = async () => {
    if (!circleName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a circle name",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const circleData = {
        name: circleName,
        description: description || undefined,
        tags: tags ? tags.split(",").map(t => t.trim()) : [],
        isPrivate: false,
        allowPublicJoin,
      };

      await apiRequest("/api/circles", {
        method: "POST",
        body: JSON.stringify(circleData),
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      
      toast({
        title: "Success!",
        description: "Your circle has been created",
      });
      
      onClose();
    } catch (error) {
      console.error("Create circle error:", error);
      toast({
        title: "Error",
        description: "Failed to create circle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[70vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create Circle</h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress indicator */}
        <div className="px-4 py-2 border-b">
          <div className="flex items-center justify-between text-sm">
            <div className={`flex items-center ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step >= 1 ? 'bg-primary text-white' : 'bg-gray-200'
              }`}>
                1
              </div>
              <span className="ml-2">Setup</span>
            </div>
            <div className={`h-px flex-1 mx-2 ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
            <div className={`flex items-center ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step >= 2 ? 'bg-primary text-white' : 'bg-gray-200'
              }`}>
                2
              </div>
              <span className="ml-2">Invite</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: '50vh' }}>
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Circle Name *</Label>
                <Input
                  id="name"
                  value={circleName}
                  onChange={(e) => setCircleName(e.target.value)}
                  placeholder="e.g. Pizza Lovers, Sushi Squad"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this circle about?"
                  className="mt-1 min-h-[60px]"
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="pizza, italian, casual (comma separated)"
                  className="mt-1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="public"
                  checked={allowPublicJoin}
                  onChange={(e) => setAllowPublicJoin(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="public" className="font-normal">
                  Allow anyone to join with invite link
                </Label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <h3 className="text-lg font-medium mb-2">Circle Created!</h3>
                <p className="text-muted-foreground mb-4">
                  You can invite friends after creating the circle.
                </p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Circle Summary:</p>
                  <p className="font-medium">{circleName}</p>
                  {description && (
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={step === 1 ? onClose : () => setStep(1)}
            disabled={isCreating}
          >
            {step === 1 ? 'Cancel' : <><ArrowLeft className="h-4 w-4 mr-1" /> Back</>}
          </Button>
          
          {step === 1 ? (
            <Button
              onClick={() => setStep(2)}
              disabled={!circleName.trim() || isCreating}
            >
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleCreateCircle}
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create Circle"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}