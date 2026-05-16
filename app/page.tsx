import { redirect } from 'next/navigation';
import HomePage from './HomePage';
const Page = () => {
  redirect('/handfasting-simple');
};
export default Page;
export const dynamic = 'force-dynamic';
