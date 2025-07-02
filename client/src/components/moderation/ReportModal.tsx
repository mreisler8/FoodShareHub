import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Flag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: 'post' | 'comment' | 'list' | 'user';
  contentId: number;
  contentTitle?: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or unwanted commercial content' },
  { value: 'inappropriate', label: 'Inappropriate or offensive content' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'false_info', label: 'False or misleading information' },
  { value: 'other', label: 'Other (please describe)' },
];

export function ReportModal({ open, onOpenChange, contentType, contentId, contentTitle }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reportMutation = useMutation({
    mutationFn: async (data: { contentType: string; contentId: number; reason: string; description?: string }) => {
      return apiRequest('/api/reports', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Report submitted',
        description: 'Thank you for helping keep our community safe. We will review your report.',
      });
      
      // Reset form and close modal
      setReason('');
      setDescription('');
      onOpenChange(false);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit report. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (!reason) {
      toast({
        title: 'Error',
        description: 'Please select a reason for reporting.',
        variant: 'destructive',
      });
      return;
    }

    if (reason === 'other' && !description.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a description when selecting "Other".',
        variant: 'destructive',
      });
      return;
    }

    reportMutation.mutate({
      contentType,
      contentId,
      reason,
      description: description.trim() || undefined,
    });
  };

  const handleClose = () => {
    setReason('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-500" />
            Report Content
          </DialogTitle>
          <DialogDescription>
            {contentTitle ? (
              <>Report "{contentTitle}" for review by our moderation team.</>
            ) : (
              <>Report this {contentType} for review by our moderation team.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Reason for reporting</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="mt-2">
              {REPORT_REASONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value} className="text-sm font-normal cursor-pointer flex-1">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Additional details {reason === 'other' && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="description"
              placeholder={
                reason === 'other' 
                  ? 'Please describe the issue...' 
                  : 'Optional: Provide additional context about this report...'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-yellow-800">
              <p className="font-medium">Before reporting:</p>
              <p>Consider if this content violates our community guidelines. False reports may affect your account.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose} disabled={reportMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={reportMutation.isPending || !reason}
            className="bg-red-600 hover:bg-red-700"
          >
            {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}