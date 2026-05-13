'use client';
import { motion } from 'framer-motion';
import type { ReactNode, CSSProperties, HTMLAttributes } from 'react';

const container = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20, filter: 'blur(5px)' },
  show:   { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] } },
};

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export function StaggerList({ children, style, className, ...rest }: Props) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" style={style} className={className} {...(rest as object)}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, style, className, ...rest }: Props) {
  return (
    <motion.div variants={item} style={style} className={className} {...(rest as object)}>
      {children}
    </motion.div>
  );
}
