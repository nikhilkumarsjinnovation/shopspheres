import { Check } from 'lucide-react';

const STEPS = [
  { key: 'placed', label: 'Placed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
] as const;

function stepIndex(status: string): number {
  if (status === 'delivered') return 3;
  if (status === 'out_for_delivery') return 2;
  if (status === 'shipped') return 1;
  if (status === 'cancelled') return -1;
  return 0;
}

export default function OrderTrack({ status }: { status: string }) {
  const current = stepIndex(status);

  if (current < 0) {
    return (
      <div style={{ display: 'inline-flex', padding: '0.35rem 0.75rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600 }}>
        ✕ Order Cancelled
      </div>
    );
  }

  return (
    <div className="order-timeline-stepper" aria-label="Order Tracking Progress">
      {STEPS.map((step, index) => {
        const isCompleted = index < current;
        const isActive = index === current;

        return (
          <div
            key={step.key}
            className={`step-node ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
          >
            <div className="step-indicator">
              {isCompleted ? <Check size={14} /> : index + 1}
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--fg-primary)' : 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
