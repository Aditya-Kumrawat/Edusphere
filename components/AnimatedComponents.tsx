import React from 'react';
import { motion } from 'framer-motion';

// --- Page Transition Wrapper ---
export interface PageTransitionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, className, ...props }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -20, scale: 0.98 }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} // smooth easeOutQuint
    className={`h-full w-full ${className}`}
    {...props}
  >
    {children}
  </motion.div>
);

// --- Stagger Container for Lists ---
export const StaggerContainer: React.FC<{ children: React.ReactNode, className?: string, delay?: number }> = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial="hidden"
    animate="show"
    variants={{
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: 0.08,
          delayChildren: delay
        }
      }
    }}
    className={className}
  >
    {children}
  </motion.div>
);

// --- Stagger Item ---
export const StaggerItem: React.FC<{ children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50, damping: 15 } }
    }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

// --- Lottie-style Loading Spinner (Pure SVG + Framer) ---
export const AnimatedLoader = () => (
  <div className="flex justify-center items-center h-full">
    <motion.div
      className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  </div>
);

// --- Hoverable Card Wrapper ---
export const HoverCard: React.FC<{ children: React.ReactNode, className?: string, onClick?: () => void }> = ({ children, className = "", onClick }) => (
  <motion.div
    whileHover={{ y: -4, scale: 1.01, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)" }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: "spring", stiffness: 400, damping: 25 }}
    className={`${className} cursor-pointer`}
    onClick={onClick}
  >
    {children}
  </motion.div>
);