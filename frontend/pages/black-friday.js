import CampaignView from '@/components/CampaignView';
import { resolveServerApiBase } from '@/lib/env';

const THEME = {
  label: 'Black Friday',
  title: 'Black Friday Deals',
  icon: 'fa-tags',
  accent: '#f59e0b',
  banner: 'linear-gradient(135deg,#000000 0%,#1a1a1a 50%,#262019 100%)',
  blurb: 'Our biggest discounts of the year — for a limited time only.',
  emptyBlurb: 'Black Friday is coming. Subscribe to our newsletter to be first in line for the biggest deals of the year.',
};

export default function BlackFriday({ campaigns }) {
  return <CampaignView campaigns={campaigns} theme={THEME} />;
}

export async function getServerSideProps({ req }) {
  try {
    const apiBase = resolveServerApiBase(req);
    const res = await fetch(`${apiBase}/campaigns?type=black_friday`, { cache: 'no-store' });
    const data = await res.json();
    return { props: { campaigns: data.success ? (data.data || []) : [] } };
  } catch {
    return { props: { campaigns: [] } };
  }
}
