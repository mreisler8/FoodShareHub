import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function CreateListSimple() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createListMutation = useMutation({
    mutationFn: async (data: any) => {
      const listResponse = await apiRequest("/api/lists", {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          tags: [],
          shareWithCircle: false,
          makePublic: true,
          type: "restaurant",
          audience: "public"
        }),
      });
      return await listResponse.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "List Created Successfully!",
        description: `"${name}" has been created.`,
      });
      navigate('/lists');
    },
    onError: (error: any) => {
      console.error('Create list error:', error);
      toast({
        title: "Error Creating List",
        description: "There was a problem creating your list. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a list name.",
        variant: "destructive",
      });
      return;
    }

    createListMutation.mutate({ name, description });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold mb-6">Create List (Simple)</h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                List Name *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My awesome restaurant list"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your list..."
                className="w-full"
                rows={3}
              />
            </div>

            <Button 
              onClick={handleSubmit} 
              className="w-full"
              disabled={createListMutation.isPending}
            >
              {createListMutation.isPending ? 'Creating...' : 'Create List'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}