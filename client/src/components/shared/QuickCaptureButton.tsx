import { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  AlignLeft, 
  Camera, 
  Check, 
  ListFilter, 
  MapPin, 
  Plus, 
  Send,
  Coffee,
  Utensils,
  Pizza
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function QuickCaptureButton() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();

  const handleNextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // In a real app, we would submit the form data here
      setOpen(false);
      setStep(1);
      setLocation('/create-post');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => setStep(1), 300); // Reset step after dialog closes
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            className="rounded-full h-14 w-14 shadow-lg fixed bottom-20 right-6 z-50"
            size="icon"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === 1 && "What did you eat today?"}
              {step === 2 && "Where did you eat?"}
              {step === 3 && "How was it?"}
            </DialogTitle>
            <DialogDescription>
              {step === 1 && "Quickly capture your food experience"}
              {step === 2 && "Find the restaurant or add a new one"}
              {step === 3 && "Share your thoughts and rating"}
            </DialogDescription>
          </DialogHeader>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-3 gap-3">
                    <QuickFoodOption icon={<Pizza />} label="Pizza" />
                    <QuickFoodOption icon={<Coffee />} label="Coffee" />
                    <QuickFoodOption icon={<Utensils />} label="Dinner" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dish-name">What did you have?</Label>
                    <Input id="dish-name" placeholder="e.g. Truffle Pasta, Matcha Latte" />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 justify-start"
                      type="button"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Add photo
                    </Button>
                  </div>
                </div>
              )}
              
              {step === 2 && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="restaurant-search">Find restaurant</Label>
                    <div className="relative">
                      <Input id="restaurant-search" placeholder="Search for a restaurant" />
                      <MapPin className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  
                  <div className="rounded-md border">
                    <div className="px-4 py-3 cursor-pointer hover:bg-muted flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Pasta Paradise</h4>
                        <p className="text-sm text-muted-foreground">Italian • $$</p>
                      </div>
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <div className="px-4 py-3 border-t cursor-pointer hover:bg-muted">
                      <h4 className="font-medium">Pasta Factory</h4>
                      <p className="text-sm text-muted-foreground">Italian • $$</p>
                    </div>
                    <div className="px-4 py-3 border-t cursor-pointer hover:bg-muted">
                      <h4 className="font-medium">Pasta House</h4>
                      <p className="text-sm text-muted-foreground">Italian • $$$</p>
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full justify-start" type="button">
                    <Plus className="mr-2 h-4 w-4" /> Add a new restaurant
                  </Button>
                </div>
              )}
              
              {step === 3 && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="rating">Rating</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <Button
                          key={rating}
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-full"
                          type="button"
                        >
                          {rating}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="thoughts">Quick thoughts</Label>
                    <Textarea 
                      id="thoughts" 
                      placeholder="What did you think? (optional)"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" type="button">
                      <ListFilter className="mr-2 h-3 w-3" /> Great flavor
                    </Button>
                    <Button variant="outline" size="sm" type="button">
                      <ListFilter className="mr-2 h-3 w-3" /> Good value
                    </Button>
                    <Button variant="outline" size="sm" type="button">
                      <ListFilter className="mr-2 h-3 w-3" /> Fast service
                    </Button>
                    <Button variant="outline" size="sm" type="button">
                      <AlignLeft className="mr-2 h-3 w-3" /> Add more
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          
          <DialogFooter className="flex sm:justify-between">
            <DialogClose asChild>
              <Button 
                type="button" 
                variant="ghost"
                onClick={handleClose}
              >
                Cancel
              </Button>
            </DialogClose>
            
            <Button type="button" onClick={handleNextStep}>
              {step < 3 ? (
                'Next'
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Share
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface QuickFoodOptionProps {
  icon: React.ReactNode;
  label: string;
}

function QuickFoodOption({ icon, label }: QuickFoodOptionProps) {
  return (
    <Button
      variant="outline"
      className="flex flex-col h-auto py-3 gap-1"
      type="button"
    >
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  );
}