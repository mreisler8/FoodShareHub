import { useState } from 'react';
import { X, UserPlus, Mail } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '../../hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  circleId: number;
  circleName: string;
}

export function InviteModal({ isOpen, onClose, circleId, circleName }: InviteModalProps) {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: async (data: { emailOrUsername: string }) => {
      return apiRequest(`/api/circles/${circleId}/invites`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Invite sent!',
        description: `Invitation sent to ${emailOrUsername}`,
      });
      setEmailOrUsername('');
      onClose();
      // Invalidate invites query
      queryClient.invalidateQueries({ queryKey: [`/api/circles/${circleId}/invites`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error sending invite',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername.trim()) return;

    inviteMutation.mutate({ emailOrUsername: emailOrUsername.trim() });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Invite to {circleName}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emailOrUsername">Email or Username</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="emailOrUsername"
                type="text"
                placeholder="Enter email or username"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <p className="text-sm text-gray-500">
              Send an invitation to join this circle
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!emailOrUsername.trim() || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}