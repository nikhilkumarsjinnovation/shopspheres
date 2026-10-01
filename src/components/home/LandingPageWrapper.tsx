'use client';

import dynamic from 'next/dynamic';

const LandingPage = dynamic(() => import('@/components/home/LandingPage'), {
  ssr: false,
  loading: () => <div style={{ height: '100vh', width: '100%', background: '#000' }} />,
});

type Props = {
  diveHref: string;
  diveLabel: string;
  signedIn: boolean;
};

export default function LandingPageWrapper(props: Props) {
  return <LandingPage {...props} />;
}
