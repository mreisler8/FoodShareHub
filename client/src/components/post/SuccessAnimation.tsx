import { useEffect, useState } from 'react';
import { PostTypeIcon, getPostTypeLabel } from './PostTypeIcon';
import { PostType } from './PostTypeSelector';
import { CheckCircle, Sparkles, Heart, Users, Globe } from 'lucide-react';

interface SuccessAnimationProps {
  type: PostType;
  onComplete: () => void;
}

export function SuccessAnimation({ type, onComplete }: SuccessAnimationProps) {
  const [animationStep, setAnimationStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setAnimationStep(1), 100);
    const timer2 = setTimeout(() => setAnimationStep(2), 600);
    const timer3 = setTimeout(() => setShowConfetti(true), 900);
    const timer4 = setTimeout(() => setAnimationStep(3), 1200);
    const timer5 = setTimeout(() => onComplete(), 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [onComplete]);

  const getSuccessMessage = () => {
    switch (type) {
      case 'list':
        return {
          title: 'List Created!',
          subtitle: 'Your curated spots are now live',
          icon: <Users className="h-8 w-8 text-blue-500" />
        };
      case 'moment':
        return {
          title: 'Moment Captured!',
          subtitle: 'Your food experience is now shared',
          icon: <Heart className="h-8 w-8 text-pink-500" />
        };
      case 'dish':
        return {
          title: 'Dish Recommended!',
          subtitle: 'Others will love your suggestion',
          icon: <Globe className="h-8 w-8 text-green-500" />
        };
      default:
        return {
          title: 'Success!',
          subtitle: 'Your post is now live',
          icon: <CheckCircle className="h-8 w-8 text-green-500" />
        };
    }
  };

  const { title, subtitle, icon } = getSuccessMessage();

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-primary rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${0.5 + Math.random() * 0.5}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Main Animation */}
      <div className="relative z-10">
        {/* Step 1: Icon Animation */}
        <div className={`transition-all duration-500 ${animationStep >= 1 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
          <div className="relative">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            
            {/* Post Type Icon Overlay */}
            <div className={`absolute -top-2 -right-2 transition-all duration-300 ${animationStep >= 2 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
              <div className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-green-500">
                <PostTypeIcon type={type} size="sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Text Animation */}
        <div className={`transition-all duration-500 delay-300 ${animationStep >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h2 className="text-2xl font-bold text-green-600 mb-2">{title}</h2>
          <p className="text-muted-foreground mb-4">{subtitle}</p>
          
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <PostTypeIcon type={type} size="sm" />
            <span>{getPostTypeLabel(type)}</span>
          </div>
        </div>

        {/* Step 3: Sparkles Animation */}
        <div className={`transition-all duration-500 delay-500 ${animationStep >= 3 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">
              Your post is now discoverable by your community
            </span>
            <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Ripple Effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-green-500 rounded-full transition-all duration-1000 ${animationStep >= 1 ? 'w-32 h-32 opacity-0' : 'w-0 h-0 opacity-100'}`} />
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-green-500 rounded-full transition-all duration-1000 delay-200 ${animationStep >= 1 ? 'w-48 h-48 opacity-0' : 'w-0 h-0 opacity-100'}`} />
      </div>
    </div>
  );
}