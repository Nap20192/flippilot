import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/utils';

/** Counts a number up when it appears and tweens smoothly whenever it changes. */
export function AnimatedNumber({ value, format, duration = 900, className }: { value: number; format: (n: number) => string; duration?: number; className?: string }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); from.current = value; return; }
    const start = performance.now();
    const f = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const v = f + (value - f) * (1 - Math.pow(1 - k, 3));
      from.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    // safety net for throttled background tabs
    const done = window.setTimeout(() => { from.current = value; setShown(value); }, duration + 250);
    return () => { cancelAnimationFrame(raf); clearTimeout(done); };
  }, [value, duration]);

  return <span className={className}>{format(shown)}</span>;
}

/** Fades and lifts its children in when they scroll into view. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.08 });
    io.observe(el);
    const fallback = window.setTimeout(() => setSeen(true), 1500); // never leave content hidden
    return () => { io.disconnect(); clearTimeout(fallback); };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(seen ? 'animate-in fade-in-0 slide-in-from-bottom-4 duration-700 ease-out fill-mode-both motion-reduce:animate-none' : 'opacity-0 motion-reduce:opacity-100', className)}
      style={seen ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/** True once the element has scrolled into view (never flips back). */
export function useInView<T extends HTMLElement>(rootMargin = '0px 0px -8% 0px'): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.15, rootMargin });
    io.observe(el);
    const fallback = window.setTimeout(() => setSeen(true), 4000); // never leave a chart blank
    return () => { io.disconnect(); clearTimeout(fallback); };
  }, [rootMargin]);
  return [ref, seen];
}

/** Mounts its children only when visible, so chart animations play when the user can see them. */
export function InView({ children, className, placeholder }: { children: ReactNode; className?: string; placeholder?: ReactNode }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return <div ref={ref} className={className}>{seen ? children : (placeholder ?? null)}</div>;
}
