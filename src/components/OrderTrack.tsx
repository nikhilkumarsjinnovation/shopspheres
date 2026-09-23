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
    <ol style={{ display: 'flex', gap: '8px', listStyle: 'none', padding: 0, margin: '8px 0 0', flexWrap: 'wrap' }}>
      {STEPS.map((step, index) => (
        <li
          key={step.key}
          style={{
            fontSize: '12px',
            fontWeight: index <= current ? 700 : 500,
            color: index <= current ? '#111111' : '#8a8a8a',
          }}
        >
          {index <= current ? '●' : '○'} {step.label}
          {index < STEPS.length - 1 ? ' →' : ''}
        </li>
      ))}
    </ol>
  );
}
