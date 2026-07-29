/**
 * Campus Connect Logo Configuration
 * Centralized management of all logo assets
 */

// Import all logo variants
import logoIcon from './logo.svg';
import logoHorizontal from './logo.svg'; // Replaced old PNG with brand vector SVG
import logoTagline from './logo-with-tagline.svg';

export const LOGOS = {
  /**
   * Icon-only logo - 48x48px
   * Use case: Navbar, headers, small spaces
   */
  icon: logoIcon,
  
  /**
   * Horizontal logo with text - High quality vector
   * Use case: Main branding, welcome page, large headers
   */
  horizontal: logoHorizontal,
  
  /**
   * Logo with tagline - SVG
   * Use case: Splash screens, auth pages, marketing
   */
  withTagline: logoTagline,
} as const;

export const LOGO_PATHS = {
  /**
   * Icon filename
   * Direct path: /logo.svg in public folder
   */
  icon: '/logo.svg',
  
  /**
   * Horizontal logo filename
   * Direct path: /logo.svg in public folder
   */
  horizontal: 'logo.svg',
  
  /**
   * Tagline logo filename
   * Direct path: /logo-with-tagline.svg in assets
   */
  withTagline: 'logo-with-tagline.svg',
} as const;

/**
 * Logo sizing presets
 */
export const LOGO_SIZES = {
  xs: 'h-4 w-4',      // Extra small - 16px
  sm: 'h-6 w-6',      // Small - 24px
  md: 'h-8 w-8',      // Medium - 32px
  lg: 'h-10 w-10',    // Large - 40px
  xl: 'h-12 w-12',    // Extra large - 48px
  '2xl': 'h-16 w-16', // 2x Large - 64px
} as const;

/**
 * Helper function to get logo with size
 */
export const getLogoWithSize = (size: keyof typeof LOGO_SIZES = 'md') => ({
  src: LOGOS.icon,
  className: LOGO_SIZES[size],
});

/**
 * Campus Connect brand constants
 */
export const BRAND = {
  name: 'Campus Connect',
  tagline: 'Connect. Chat. Campus Life.',
  description: 'Connect with students, chat securely, and discover campus life events.',
  colors: {
    primary: '#3B82F6',      // Blue
    secondary: '#1F2937',    // Dark Gray
    accent: '#06B6D4',       // Cyan
  },
} as const;

export default LOGOS;
