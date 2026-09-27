'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'icon';
  children: ReactNode;
};

export default function UiButton({
  tone: _tone = 'primary',
  size: _size = 'md',
  children,
  type = 'button',
  ...rest
}: Props) {
  return (
    <button type={type} {...rest}>
      {children}
    </button>
  );
}
