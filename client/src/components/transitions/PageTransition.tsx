import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import { useLocation } from 'wouter';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

// Animation variants for different transition types
const pageVariants = {
  initial: {
    opacity: 0,
    x: 20,
    scale: 0.98
  },
  in: {
    opacity: 1,
    x: 0,
    scale: 1
  },
  out: {
    opacity: 0,
    x: -20,
    scale: 0.98
  }
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4
};

// Slide transition for mobile-like navigation
const slideVariants = {
  initial: {
    opacity: 0,
    x: '100%'
  },
  in: {
    opacity: 1,
    x: 0
  },
  out: {
    opacity: 0,
    x: '-100%'
  }
};

const slideTransition = {
  type: 'tween',
  ease: [0.25, 0.46, 0.45, 0.94],
  duration: 0.35
};

// Fade transition for overlays and modals
const fadeVariants = {
  initial: {
    opacity: 0,
    scale: 0.95
  },
  in: {
    opacity: 1,
    scale: 1
  },
  out: {
    opacity: 0,
    scale: 0.95
  }
};

const fadeTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.25
};

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className={`${className}`}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function SlideTransition({ children, className = '' }: PageTransitionProps) {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location}
        initial="initial"
        animate="in"
        exit="out"
        variants={slideVariants}
        transition={slideTransition}
        className={`${className}`}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function FadeTransition({ children, className = '' }: PageTransitionProps) {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location}
        initial="initial"
        animate="in"
        exit="out"
        variants={fadeVariants}
        transition={fadeTransition}
        className={`${className}`}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Staggered animation for list items
export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

export const staggerItem = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'tween',
      ease: 'easeOut',
      duration: 0.3
    }
  }
};

// Route-specific transition configurations
export const getTransitionForRoute = (route: string) => {
  // Use slide transition for mobile-like navigation between main sections
  if (route.includes('/feed') || route.includes('/discover') || route.includes('/circles') || route.includes('/profile')) {
    return SlideTransition;
  }
  
  // Use fade transition for modals and overlays
  if (route.includes('/create') || route.includes('/share')) {
    return FadeTransition;
  }
  
  // Default page transition for other routes
  return PageTransition;
};