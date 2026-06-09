import CampaignView from '@/components/CampaignView';
import { resolveServerApiBase } from '@/lib/env';

const THEME = {
  label: 'Easter',
  title: 'Easter Sale',
  icon: 'fa-egg',
  accent: '#8b5cf6',
  banner: 'linear-gradient(135deg,#312e81 0%,#5b21b6 50%,#7e22ce 100%)',
  blurb: 'Celebrate Easter with special limited-time offers across the store.',
  emptyBlurb: 'Our Easter sale is hatching soon. Subscribe to our newsletter so you don’t miss the egg-stra special deals.',
};

export default function Easter({ campaigns }) {
  return <CampaignView campaigns={campaigns} theme={THEME} />;
}

export async function getServerSideProps({ req }) {
  try {
    const apiBase = resolveServerApiBase(req);
    const res = await fetch(`${apiBase}/campaigns?type=easter`, { cache: 'no-store' });
    const data = await res.json();
    return { props: { campaigns: data.success ? (data.data || []) : [] } };
  } catch {
    return { props: { campaigns: [] } };
  }
}
