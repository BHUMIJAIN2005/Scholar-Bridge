'use client';

import { useEffect, useRef } from 'react';
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';

interface AnimatedCountProps {
  value: number;
  className?: string;
  label: string;
}

export default function AnimatedCount({ value, className, label }: AnimatedCountProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.6 });
  const prefersReducedMotion = useReducedMotion();
  const count = useMotionValue(0);
  const roundedCount = useTransform(count, (latest) =>
    Math.round(latest).toLocaleString()
  );

  useEffect(() => {
    if (!isInView) return;
    if (prefersReducedMotion) {
      count.set(value);
      return;
    }

    const controls = animate(count, value, {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [count, isInView, prefersReducedMotion, value]);

  return (
    <motion.span ref={ref} className={className} aria-label={`${value} ${label}`}>
      {roundedCount}
    </motion.span>
  );
}