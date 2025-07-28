import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedLayoutProps {
  children: ReactNode;
  className?: string;
}

// Enhanced layout animations for card grids and lists
export function AnimatedCardGrid({ children, className = '' }: AnimatedLayoutProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {
          opacity: 0
        },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedCard({ children, className = '' }: AnimatedLayoutProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: {
          opacity: 0,
          y: 20,
          scale: 0.95
        },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            type: 'spring',
            stiffness: 400,
            damping: 25,
            mass: 0.8
          }
        }
      }}
      whileHover={{
        scale: 1.02,
        transition: {
          type: 'spring',
          stiffness: 400,
          damping: 25
        }
      }}
      whileTap={{
        scale: 0.98
      }}
    >
      {children}
    </motion.div>
  );
}

// List item animations
export function AnimatedList({ children, className = '' }: AnimatedLayoutProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {
          opacity: 0
        },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.05,
            delayChildren: 0.05
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedListItem({ children, className = '' }: AnimatedLayoutProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: {
          opacity: 0,
          x: -20
        },
        visible: {
          opacity: 1,
          x: 0,
          transition: {
            type: 'spring',
            stiffness: 500,
            damping: 30
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
}

// Button animations
export function AnimatedButton({ children, className = '' }: AnimatedLayoutProps) {
  return (
    <motion.div
      className={className}
      whileHover={{
        scale: 1.05,
        transition: {
          type: 'spring',
          stiffness: 400,
          damping: 25
        }
      }}
      whileTap={{
        scale: 0.95,
        transition: {
          type: 'spring',
          stiffness: 600,
          damping: 30
        }
      }}
    >
      {children}
    </motion.div>
  );
}

// Header animations
export function AnimatedHeader({ children, className = '' }: AnimatedLayoutProps) {
  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        y: -20
      }}
      animate={{
        opacity: 1,
        y: 0,
        transition: {
          type: 'spring',
          stiffness: 400,
          damping: 25,
          delay: 0.1
        }
      }}
    >
      {children}
    </motion.div>
  );
}

// Modal animations
export function AnimatedModal({ children, className = '' }: AnimatedLayoutProps) {
  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        scale: 0.9,
        y: 20
      }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
          type: 'spring',
          stiffness: 500,
          damping: 30
        }
      }}
      exit={{
        opacity: 0,
        scale: 0.9,
        y: 20,
        transition: {
          type: 'tween',
          ease: 'easeInOut',
          duration: 0.2
        }
      }}
    >
      {children}
    </motion.div>
  );
}