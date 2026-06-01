import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Track Order has been removed. Redirect to the orders tab in account.
export default function TrackOrder() {
  const router = useRouter();
  useEffect(() => { router.replace('/account?tab=orders'); }, []);
  return null;
}

export async function getServerSideProps() {
  return { redirect: { destination: '/account?tab=orders', permanent: false } };
}
