import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Card container component
 *
 * @public
 */
function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        `
          flex flex-col gap-6 rounded-xl border bg-card py-6
          text-card-foreground shadow-sm
        `,
        className
      )}
      {...props}
    />
  );
}

/**
 * Card header component
 *
 * @public
 */
function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        `
          @container/card-header grid auto-rows-min grid-rows-[auto_auto]
          items-start gap-1.5 px-6
          has-data-[slot=card-action]:grid-cols-[1fr_auto]
          [.border-b]:pb-6
        `,
        className
      )}
      {...props}
    />
  );
}

/**
 * Card title component
 *
 * @public
 */
function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  );
}

/**
 * Card description component
 *
 * @public
 */
function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

/**
 * Card action component for header actions
 *
 * @public
 */
function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        `
        col-start-2 row-span-2 row-start-1 self-start justify-self-end
      `,
        className
      )}
      {...props}
    />
  );
}

/**
 * Card content component
 *
 * @public
 */
function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-6', className)} {...props} />;
}

/**
 * Card footer component
 *
 * @public
 */
function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        `
        flex items-center px-6
        [.border-t]:pt-6
      `,
        className
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
