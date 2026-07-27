import { redirect } from 'next/navigation';

// One public entrypoint, not two: / carries the cookie-gated experience, and
// this old alias just forwards there so the gate can't drift out of sync.
export default function Page() {
  redirect('/');
}
