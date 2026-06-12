/**
 * Campus Connect Logo Component
 * Reusable logo display with multiple variants
 */

import React from 'react';
import { LOGOS, LOGO_SIZES, BRAND } from '@/assets';

export interface LogoProps {
  /**
   * Logo variant: 'icon' | 'horizontal' | 'withTagline'
   * @default 'icon'
   */
  variant?: keyof typeof LOGOS;
  
  /**
   * Size preset: xs, sm, md, lg, xl, 2xl
   * @default 'md'
   */
  size?: keyof typeof LOGO_SIZES;
  
  /**
   * Custom className
   */
  className?: string;
  
  /**
   * Alt text for accessibility
   * @default 'Campus Connect'
   */
  alt?: string;
  
  /**
   * onClick handler
   */
  onClick?: () => void;
  
  /**
   * Whether to add animation
   * @default false
   */
  animated?: boolean;
  
  /**
   * Custom width (overrides size)
   */
  width?: number | string;
  
  /**
   * Custom height (overrides size)
   */
  height?: number | string;
}

/**
 * Logo Component
 * 
 * Usage:
 * <Logo variant="icon" size="md" />
 * <Logo variant="horizontal" />
 * <Logo variant="withTagline" animated />
 */
export const Logo: React.FC<LogoProps> = ({
  variant = 'icon',
  size = 'md',
  className = '',
  alt = BRAND.name,
  onClick,
  animated = false,
  width,
  height,
}) => {
  const logoSrc = LOGOS[variant];
  const sizeClass = LOGO_SIZES[size];
  
  // Determine styling
  let finalClassName: string = sizeClass;
  if (width || height) {
    finalClassName = ''; // Remove size class if custom dimensions provided
  }
  if (className) {
    finalClassName = `${finalClassName} ${className}`.trim();
  }
  if (animated) {
    finalClassName = `${finalClassName} hover:scale-105 transition-transform duration-300 cursor-pointer`;
  }
  if (onClick) {
    finalClassName = `${finalClassName} cursor-pointer`;
  }

  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <img
      src={logoSrc}
      alt={alt}
      className={finalClassName}
      onClick={onClick}
      style={style}
      loading="lazy"
    />
  );
};

/**
 * Logo with Brand Name Component
 * Shows logo + "Campus Connect" text
 */
export const LogoWithBrand: React.FC<Omit<LogoProps, 'variant'>> = (props) => {
  return (
    <div className="flex items-center gap-2">
      <Logo {...props} variant="icon" size="sm" />
      <span className="font-bold text-lg text-foreground">
        {BRAND.name}
      </span>
    </div>
  );
};

/**
 * Brand Header Component
 * Complete header with logo, name, and tagline
 */
export interface BrandHeaderProps extends Omit<LogoProps, 'variant'> {
  /**
   * Whether to show tagline
   * @default true
   */
  showTagline?: boolean;
  
  /**
   * Whether to show vertical layout
   * @default false
   */
  vertical?: boolean;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({
  showTagline = true,
  vertical = false,
  className = '',
  ...logoProps
}) => {
  const containerClass = vertical
    ? 'flex flex-col items-center gap-2'
    : 'flex items-center gap-3';

  return (
    <div className={`${containerClass} ${className}`}>
      <Logo {...logoProps} variant="icon" size="lg" />
      <div className={vertical ? 'text-center' : ''}>
        <h1 className="font-bold text-2xl text-foreground">
          {BRAND.name}
        </h1>
        {showTagline && (
          <p className="text-sm text-muted-foreground">
            {BRAND.tagline}
          </p>
        )}
      </div>
    </div>
  );
};

export default Logo;
