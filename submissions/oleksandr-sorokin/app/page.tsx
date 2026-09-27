import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/etfs');
  return null;
}
