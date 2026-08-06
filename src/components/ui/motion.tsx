"use client";

/**
 * Velox Studio — shared motion vocabulary (Framer Motion).
 *
 * Every entrance/transition in the app should go through these primitives so
 * the motion stays consistent, restrained, and respects reduced-motion.
 *
 * Design notes:
 *  - The signature easing `cubic-bezier(.16,1,.3,1)` is reused from the CSS
 *    design system for a unified feel between CSS and JS animation.
 *  - Motion is intentionally subtle: small distances, short durations.
 *    Premium UIs guide attention; they don't perform.
 */

import * as React from "react";
import {
  motion,
  useReducedMotion,
  type Variants,
  type HTMLMotionProps,
} from "framer-motion";
import { cn } from "@/lib/utils";

// Cubic bezier matching globals.css easing — keeps CSS + JS in lockstep.
export const EASE = [0.16, 1, 0.3, 1] as const;
export const EASE_OUT_BACK = [0.34, 1.56, 0.64, 1] as const;

// Softer spring: less stiff, more damped — floats instead of snaps.
// Premium UIs feel like they have weight, not like rubber bands.
const SPRING = { type: "spring", stiffness: 260, damping: 28, mass: 0.9 } as const;

// ────────────────────────────────────────────────────────────────
//  FadeIn — single element rising into view.
// ────────────────────────────────────────────────────────────────
type Direction = "up" | "down" | "left" | "right" | "none";

const offsetFor = (dir: Direction, d: number) => {
  switch (dir) {
    case "up": return { y: d };
    case "down": return { y: -d };
    case "left": return { x: d };
    case "right": return { x: -d };
    default: return {};
  }
};

export interface FadeInProps extends HTMLMotionProps<"div"> {
  /** Entrance direction. */
  direction?: Direction;
  /** Travel distance in px. */
  distance?: number;
  /** Delay in seconds. */
  delay?: number;
  /** Animate only when scrolled into view (default: animate on mount). */
  whenInView?: boolean;
  /** Render once and stay (for scroll reveals). */
  once?: boolean;
}

export function FadeIn({
  children,
  direction = "up",
  distance = 16,
  delay = 0,
  whenInView = false,
  once = true,
  className,
  ...rest
}: FadeInProps) {
  const reduce = useReducedMotion();
  const initial = reduce
    ? { opacity: 0 }
    : { opacity: 0, ...offsetFor(direction, distance) };

  const MotionTag = whenInView ? motion.div : motion.div;
  const animProps = whenInView
    ? {
        initial,
        whileInView: { opacity: 1, x: 0, y: 0 },
        viewport: { once, margin: "-60px" },
      }
    : { initial, animate: { opacity: 1, x: 0, y: 0 } };

  return (
    <MotionTag
      transition={{ duration: 0.5, ease: EASE, delay }}
      className={className}
      {...animProps}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

// ────────────────────────────────────────────────────────────────
//  Stagger / StaggerItem — orchestrated list/grid entrances.
// ────────────────────────────────────────────────────────────────
export interface StaggerProps extends HTMLMotionProps<"div"> {
  /** Delay between each child. */
  stagger?: number;
  /** Delay before the first child animates. */
  delayChildren?: number;
  whenInView?: boolean;
}

export function Stagger({
  children,
  stagger = 0.06,
  delayChildren = 0,
  whenInView = false,
  className,
  ...rest
}: StaggerProps) {
  const reduce = useReducedMotion();
  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduce ? 0 : stagger,
        delayChildren: reduce ? 0 : delayChildren,
      },
    },
  };
  const animProps = whenInView
    ? { initial: "hidden" as const, whileInView: "show" as const, viewport: { once: true, margin: "-60px" } }
    : { initial: "hidden" as const, animate: "show" as const };

  return (
    <motion.div
      variants={container}
      className={className}
      {...animProps}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export interface StaggerItemProps extends HTMLMotionProps<"div"> {
  direction?: Direction;
  distance?: number;
}

export function StaggerItem({
  children,
  direction = "up",
  distance = 14,
  className,
  ...rest
}: StaggerItemProps) {
  const reduce = useReducedMotion();
  const item: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, ...offsetFor(direction, distance) },
    show: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.5, ease: EASE },
    },
  };
  return (
    <motion.div variants={item} className={className} {...rest}>
      {children}
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────
//  PageTransition — wraps dashboard page content for route changes.
// ────────────────────────────────────────────────────────────────
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────
//  ScaleIn — for modals, popovers, drawers entering with a pop.
// ────────────────────────────────────────────────────────────────
export function ScaleIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────
//  MotionCard — a Card wrapper with spring hover-lift + pointer glow.
//  Complements the existing CSS `.card-hover`; use either. This one
//  gives a smoother, spring-based lift.
// ────────────────────────────────────────────────────────────────
export interface MotionCardProps extends HTMLMotionProps<"div"> {
  lift?: number;
}

export function MotionCard({
  children,
  className,
  lift = 3,
  ...rest
}: MotionCardProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -lift }}
      whileTap={reduce ? undefined : { y: 0, scale: 0.995 }}
      transition={SPRING}
      className={cn(
        "rounded-lg border border-border bg-surface",
        "transition-colors duration-300 hover:border-brand/30",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────
//  AnimateHeight — for expanding/collapsing sections.
// ────────────────────────────────────────────────────────────────
export function AnimateHeight({
  open,
  children,
  className,
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={false}
      animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className={cn("overflow-hidden", className)}
    >
      {children}
    </motion.div>
  );
}

export { SPRING, motion };
