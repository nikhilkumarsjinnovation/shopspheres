const STEPS = [
  { key: 'placed', label: 'Order placed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'out_for_delivery', label: 'Out for delivery' },
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
    return <p>This order was cancelled.</p>;
  }
  return (
    <ol>
      {STEPS.map((step, index) => (
        <li
          key={step.key}
        >
          {index <= current ? '●' : '○'} {step.label}
          {index < STEPS.length - 1 ? ' →' : ''}
        </li>
      ))}
    </ol>
  );
}
