'use client';

import type { ElementType, ReactNode, CSSProperties } from 'react';

interface StarBorderProps {
  as?: ElementType;
  className?: string;
  children?: ReactNode;
  color?: string;
  speed?: CSSProperties['animationDuration'];
  thickness?: number;
  innerClassName?: string;
  onClick?: () => void;
  href?: string;
}

export function StarBorder({
  as = 'button',
  className = '',
  color = '#4d94ff',
  speed = '6s',
  thickness = 1,
  children,
  innerClassName = '',
  ...rest
}: StarBorderProps) {
  const Component = as;

  return (
    <Component
      className={`relative inline-block overflow-hidden rounded-[16px] ${className}`}
      style={{ padding: `${thickness}px 0` }}
      {...rest}
    >
      <div
        className="absolute bottom-[-11px] right-[-250%] z-0 h-[50%] w-[300%] rounded-full opacity-60 animate-star-movement-bottom"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      />
      <div
        className="absolute top-[-10px] left-[-250%] z-0 h-[50%] w-[300%] rounded-full opacity-60 animate-star-movement-top"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      />
      <div
        className={`relative z-1 rounded-[16px] border border-white/[0.08] bg-[#0a0a0a] px-8 py-3 text-center text-sm font-medium text-[#fafafa] ${innerClassName}`}
      >
        {children}
      </div>
    </Component>
  );
}