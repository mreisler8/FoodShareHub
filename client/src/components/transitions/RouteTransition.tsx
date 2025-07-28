import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import { useLocation } from 'wouter';

interface RouteTransitionProps {
  children: ReactNode;
}

// Enhanced route transition with direction detection
export function RouteTransition({ children }: RouteTransitionProps) {
  const [location] = useLocation();

  // Route hierarchy for determining transition direction
  const routeHierarchy = [
    '/',
    '/feed', 
    '/discover',
    '/circles',
    '/profile',
    '/create-list',
    '/lists/',
    '/restaurants/'
  ];

  const getRouteLevel = (route: string) => {
    return routeHierarchy.findIndex(r => route.startsWith(r)) || 0;
  };

  // Determine transition direction based on route depth
  const isForward = () => {
    const currentLevel = getRouteLevel(location);
    const previousLevel = typeof window !== 'undefined' 
      ? getRouteLevel(window.history.state?.previousRoute || '/') 
      : 0;
    return currentLevel > previousLevel;
  };

  const variants = {
    initial: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? 300 : -300,
      scale: 0.95
    }),
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 0.8
      }
    },
    exit: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? -300 : 300,
      scale: 0.95,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 0.8
      }
    })
  };

  return (
    <AnimatePresence mode="wait" custom={isForward() ? 1 : -1}>
      <motion.div
        key={location}
        custom={isForward() ? 1 : -1}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Specialized transition for mobile navigation
export function MobileNavTransition({ children }: RouteTransitionProps) {
  const [location] = useLocation();

  const mobileVariants = {
    initial: {
      opacity: 0,
      y: 20,
      scale: 0.98
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25,
        duration: 0.3
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.98,
      transition: {
        type: 'tween',
        ease: 'easeInOut',
        duration: 0.2
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        variants={mobileVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}