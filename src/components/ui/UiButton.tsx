'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { buttonBase, buttonSize, buttonTone } from '@/styles/ui.css';

type Tone = keyof typeof buttonTone;
type Size = keyof typeof buttonSize;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  size?: Size;
  children: ReactNode;
};

export default function UiButton({
  tone = 'primary',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: Props) {
  const classes = [buttonBase, buttonTone[tone], buttonSize[size], className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
