import type { Variants } from 'motion/react';

const easeOut = [0.22, 1, 0.36, 1] as const;

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.32, ease: easeOut } },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: easeOut },
  },
};

export const staggerChildren: Variants = {
  hidden: {},
  visible: {
    transition: { delayChildren: 0.05, staggerChildren: 0.075 },
  },
};

export const cardReveal: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: easeOut },
  },
};

export const dropdown: Variants = {
  hidden: { opacity: 0, y: -7, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.18, ease: easeOut },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.98,
    transition: { duration: 0.13, ease: 'easeIn' },
  },
};

export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.16 } },
};

export const modalPanel: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.24, ease: easeOut },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.98,
    transition: { duration: 0.16, ease: 'easeIn' },
  },
};

export const expandSection: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: { duration: 0.24, ease: easeOut },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.18, ease: 'easeIn' },
  },
};

export const hoverElevation = {
  y: -4,
  transition: { type: 'spring' as const, stiffness: 360, damping: 28 },
};

export const tapFeedback = {
  scale: 0.98,
  transition: { duration: 0.12 },
};