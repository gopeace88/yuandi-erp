'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both';
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, orientation = 'vertical', ...props }, ref) => {
    const scrollClass = cn(
      'relative overflow-auto',
      {
        'overflow-y-auto overflow-x-hidden': orientation === 'vertical',
        'overflow-x-auto overflow-y-hidden': orientation === 'horizontal',
        'overflow-auto': orientation === 'both',
      },
      className
    );

    return (
      <div ref={ref} className={scrollClass} {...props}>
        <div className="relative">{children}</div>
      </div>
    );
  }
);
ScrollArea.displayName = 'ScrollArea';

const ScrollBar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex touch-none select-none transition-colors', className)}
    {...props}
  />
));
ScrollBar.displayName = 'ScrollBar';

export { ScrollArea, ScrollBar };