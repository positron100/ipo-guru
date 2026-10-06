"use client";
import { MotionConfig } from "framer-motion";

/** Honours prefers-reduced-motion for every framer-motion transform animation. */
export const Providers = ({ children }: { children: React.ReactNode }) => (
  <MotionConfig reducedMotion="user">{children}</MotionConfig>
);
