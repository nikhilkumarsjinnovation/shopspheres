'use client';

import React from 'react';
import { Check, ShoppingBag, CreditCard, ShieldCheck, CheckCircle2 } from 'lucide-react';

export type CheckoutStep = 'review' | 'payment' | 'confirmation' | 'success';

interface CheckoutStepperProps {
  currentStep: CheckoutStep;
  onStepClick?: (step: CheckoutStep) => void;
}

const STEPS: { key: CheckoutStep; num: number; title: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'review', num: 1, title: 'Bag & Method', desc: 'Address, offers, method', icon: <ShoppingBag size={16} /> },
  { key: 'payment', num: 2, title: 'Payment Details', desc: 'Dedicated gateway & check', icon: <CreditCard size={16} /> },
  { key: 'confirmation', num: 3, title: 'Review & Confirm', desc: 'Final breakdown verify', icon: <ShieldCheck size={16} /> },
  { key: 'success', num: 4, title: 'Order Confirmed', desc: 'Receipt & tracking', icon: <CheckCircle2 size={16} /> },
];

export default function CheckoutStepper({ currentStep, onStepClick }: CheckoutStepperProps) {
  const getStepIndex = (step: CheckoutStep) => {
    switch (step) {
      case 'review': return 0;
      case 'payment': return 1;
      case 'confirmation': return 2;
      case 'success': return 3;
    }
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="checkout-stepper-container" role="navigation" aria-label="Checkout Progress">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isActive = idx === currentIndex;
        const isClickable = isCompleted && onStepClick && currentStep !== 'success';

        return (
          <React.Fragment key={step.key}>
            <div
              className={`checkout-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => {
                if (isClickable) onStepClick(step.key);
              }}
              style={{ cursor: isClickable ? 'pointer' : 'default' }}
              title={isClickable ? `Return to ${step.title}` : undefined}
            >
              <div className="checkout-step-circle">
                {isCompleted ? <Check size={16} strokeWidth={3} /> : step.num}
              </div>
              <div className="checkout-step-text">
                <span className="checkout-step-title">{step.title}</span>
                <span className="checkout-step-desc">{step.desc}</span>
              </div>
            </div>

            {idx < STEPS.length - 1 && (
              <div className={`checkout-step-divider ${idx < currentIndex ? 'filled' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
