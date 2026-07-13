import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Handfasting2 from '../../handfasting-simple/Handfasting2';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Save the date — Ray & Elizabeth',
  robots: { index: false, follow: false },
};

export default async function PersonalizedInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitee = await prisma.invitee.findUnique({ where: { inviteToken: token } });
  if (!invitee) notFound();
  return (
    <Handfasting2
      personalization={{
        inviteeName: invitee.name,
        inviteToken: token,
        invitationHtml: invitee.invitationHtml,
      }}
    />
  );
}
