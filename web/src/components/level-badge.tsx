import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import type { Level } from '@/api';
import { cn } from '@/lib/utils';

const TONE: Record<Level, string> = {
  g: 'bg-pos-muted text-pos',
  a: 'bg-warn-muted text-warn',
  r: 'bg-neg-muted text-destructive',
  b: 'bg-secondary text-foreground',
};

/** Badge colored by an analysis level (g / a / r / b). */
export function LevelBadge({ level, children, className }: { level: Level; children: ReactNode; className?: string }) {
  return <Badge variant="secondary" className={cn('border-transparent font-medium', TONE[level], className)}>{children}</Badge>;
}
