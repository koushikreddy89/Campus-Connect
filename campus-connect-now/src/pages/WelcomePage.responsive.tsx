/**
 * Responsive Design System for WelcomePage
 * Mobile-first, premium, minimal design
 * Uses `clamp()` for fluid scaling across all devices
 */

// Input styling with responsive properties
export const inputClassResponsive = `
  w-full 
  bg-white/[0.02] 
  backdrop-blur-md 
  border 
  border-white/10 
  rounded-[clamp(12px,3vw,16px)] 
  px-[clamp(12px,4vw,20px)] 
  py-[clamp(12px,3vw,16px)] 
  text-foreground 
  placeholder:text-muted-foreground/45 
  outline-none 
  focus:ring-2 
  focus:ring-primary/35 
  focus:border-primary/40 
  focus:bg-white/[0.04]
  focus:shadow-[0_0_15px_-3px_rgba(102,126,234,0.15)]
  text-center 
  text-[clamp(14px,2vw,16px)] 
  transition-all 
  duration-300 
  hover:border-white/15
`;

// Heading 1 - Main title (responsive)
export const h1ClassResponsive = `
  font-display 
  font-bold 
  text-gradient 
  text-[clamp(28px,7vw,48px)] 
  leading-tight 
  tracking-tight
`;

// Heading 2 - Section title (responsive)
export const h2ClassResponsive = `
  text-[clamp(15px,4vw,24px)] 
  font-semibold 
  text-foreground
`;

// Body text (responsive)
export const bodyTextResponsive = `
  text-muted-foreground 
  text-[clamp(13px,2.5vw,15px)] 
  leading-relaxed
`;

// Small text (responsive)
export const smallTextResponsive = `
  text-[clamp(11px,2vw,13px)] 
  text-muted-foreground/70
`;

// Button styles (responsive)
export const buttonResponsive = `
  rounded-[clamp(12px,3vw,16px)] 
  h-[clamp(44px,12vw,56px)] 
  px-[clamp(16px,4vw,24px)] 
  text-[clamp(14px,2.5vw,16px)] 
  font-semibold 
  transition-all 
  duration-200 
  hover:shadow-xl 
  active:scale-95
`;

// Card components (responsive)
export const cardResponsive = `
  flex 
  flex-col 
  items-center 
  gap-[clamp(12px,3vw,16px)] 
  p-[clamp(16px,4vw,24px)] 
  rounded-[clamp(16px,4vw,24px)] 
  border 
  border-white/[0.06] 
  transition-all 
  duration-300 
  cursor-pointer 
  backdrop-blur-xl 
  bg-white/[0.03] 
  hover:bg-white/[0.08]
  hover:border-primary/45
  hover:shadow-[0_0_24px_-4px_rgba(102,126,234,0.2)]
  active:scale-[0.98]
`;

// Icon container (responsive)
export const iconContainerResponsive = `
  h-[clamp(44px,12vw,56px)] 
  w-[clamp(44px,12vw,56px)] 
  rounded-[clamp(12px,3vw,16px)]
`;

// Container padding (responsive)
export const containerPaddingResponsive = `
  px-[clamp(16px,4vw,32px)] 
  sm:px-[clamp(20px,5vw,40px)] 
  py-[clamp(32px,8vw,48px)]
`;

// Main content width constraint
export const contentWidthResponsive = `
  max-w-[clamp(320px,90vw,480px)]
`;

/**
 * Responsive spacing system (8px base)
 * Used for consistent margins and padding
 */
export const spacing = {
  xs: 'clamp(8px, 1vw, 12px)',      // Extra small
  sm: 'clamp(12px, 2vw, 16px)',    // Small
  md: 'clamp(16px, 3vw, 20px)',    // Medium
  lg: 'clamp(20px, 4vw, 28px)',    // Large
  xl: 'clamp(24px, 5vw, 32px)',    // Extra large
  xxl: 'clamp(32px, 6vw, 48px)',   // 2X large
};

/**
 * Icon sizes (responsive)
 */
export const iconSizes = {
  sm: 'clamp(16px, 4vw, 20px)',
  md: 'clamp(20px, 5vw, 28px)',
  lg: 'clamp(28px, 8vw, 36px)',
  xl: 'clamp(32px, 10vw, 48px)',
};

/**
 * Text sizes (responsive with clamp)
 */
export const textSizes = {
  xs: 'clamp(11px, 2vw, 12px)',
  sm: 'clamp(12px, 2vw, 14px)',
  base: 'clamp(14px, 2.5vw, 16px)',
  lg: 'clamp(15px, 4vw, 18px)',
  xl: 'clamp(18px, 4.5vw, 24px)',
  '2xl': 'clamp(24px, 6vw, 32px)',
  '3xl': 'clamp(28px, 7vw, 48px)',
};

/**
 * Border radius (responsive)
 */
export const borderRadius = {
  sm: 'clamp(8px, 2vw, 12px)',
  md: 'clamp(12px, 3vw, 16px)',
  lg: 'clamp(16px, 4vw, 24px)',
};

/**
 * Responsive Grid/Layout Classes
 */
export const layoutResponsive = {
  // Main container for centered content
  centerContainer: `
    flex 
    flex-col 
    items-center 
    text-center 
    max-w-[clamp(320px,90vw,480px)] 
    mx-auto 
    w-full
  `,

  // Two-column grid that stacks on mobile
  cardGrid: `
    grid 
    grid-cols-1 
    sm:grid-cols-2 
    gap-[clamp(12px,3vw,16px)] 
    w-full
  `,

  // Horizontal divider with text
  divider: `
    flex 
    items-center 
    gap-[clamp(12px,3vw,16px)] 
    w-full 
    my-[clamp(20px,5vw,24px)]
  `,
};

/**
 * Animation settings (responsive to device)
 */
export const animationSettings = {
  // Smooth fade and slide
  fadeSlide: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeInOut' },
  },

  // Scale animation
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.2 },
  },

  // Button hover
  buttonHover: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
  },
};

/**
 * Responsive breakpoints for reference
 * Mobile: 320px – 480px
 * Tablet: 481px – 768px
 * Laptop: 769px – 1024px
 * Desktop: 1025px+
 */
export const breakpoints = {
  mobile: '(max-width: 480px)',
  tablet: '(max-width: 768px)',
  laptop: '(max-width: 1024px)',
  desktop: '(min-width: 1025px)',
};
