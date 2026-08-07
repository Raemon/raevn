'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { adminButtonClassName, adminMutedClassName } from './adminTableStyles';
import {
  INVITE_LINK_PLACEHOLDER,
  INVITEE_NAME_PLACEHOLDER,
  NUDGE_EMAIL_STARTER_DRAFT_HTML,
  type InvitationEmail,
  type InvitationEmailKind,
} from '@/lib/invitationEmail';

// The invitation email itself — its own subject and body, written here and sent
// verbatim by the Send buttons below. Deliberately separate from the invitation
// letter above: the letter is what the invite page shows, this is what lands in
// the inbox. Styled like the rest of /admin rather than like the invite page,
// because mail clients won't render the invite page's typography anyway.
//
// The same component edits the nudge, which is the same shape of thing sent to
// people who never answered.

const InvitationEmailEditor = ({
  kind,
  initialEmail,
}: {
  kind: InvitationEmailKind;
  initialEmail: InvitationEmail;
}) => {
  const router = useRouter();
  const [subject, setSubject] = useState(initialEmail.subject);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [testAddress, setTestAddress] = useState('');
  const [testReport, setTestReport] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  // An unwritten nudge opens on a draft rather than a blank box — a blank box
  // is why the nudge stayed unwritten and every chase went out as a duplicate
  // invitation. It is only offered, never saved: until Save is pressed the
  // Awaiting-reply tab still says no nudge exists.
  const isUnsavedNudgeDraft = kind === 'nudge' && !initialEmail.bodyHtml;
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialEmail.bodyHtml ?? (isUnsavedNudgeDraft ? NUDGE_EMAIL_STARTER_DRAFT_HTML : ''),
    immediatelyRender: false,
    // TipTap 3 re-renders the host component only when asked to. Both the
    // toolbar's active states and the placeholder readout below are read off
    // the editor during render, so without this they'd show whatever was true
    // when the component last happened to re-render for some other reason.
    shouldRerenderOnTransaction: true,
    onUpdate: () => setSaveState('idle'),
  });
  const saveEmail = async () => {
    if (!editor) return;
    setSaveState('saving');
    const response = await fetch('/api/admin/invitation-email', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, subject, bodyHtml: editor.isEmpty ? null : editor.getHTML() }),
    }).catch(() => null);
    setSaveState(response?.ok ? 'saved' : 'error');
    // The Send buttons are gated on this body existing, and that gate is
    // computed on the server — without a refresh they'd stay greyed out until
    // a manual reload.
    if (response?.ok) router.refresh();
  };

  // A near-miss placeholder ({{ link }}, a stray capital, a brace the editor
  // swallowed) fails silently: the link just gets appended at the end and the
  // email sends looking fine to whoever wrote it. So say out loud which
  // placeholders the current draft actually contains.
  const bodyText = editor?.getText() ?? '';
  const hasLinkPlaceholder = bodyText.includes(INVITE_LINK_PLACEHOLDER);
  const hasNamePlaceholder = bodyText.includes(INVITEE_NAME_PLACEHOLDER);

  const sendTest = async () => {
    setIsTesting(true);
    setTestReport(null);
    const response = await fetch('/api/admin/send-test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, to: testAddress }),
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as
      | { ok?: boolean; reason?: string }
      | null;
    setTestReport(
      payload?.ok
        ? `Sent to ${testAddress} — check that the link and the greeting look right.`
        : `Not sent: ${payload?.reason ?? 'request failed'}`,
    );
    setIsTesting(false);
  };

  const toolbarActions = editor
    ? ([
        { label: 'B', title: 'Bold', isActive: editor.isActive('bold'), run: () => editor.chain().focus().toggleBold().run() },
        { label: 'I', title: 'Italic', isActive: editor.isActive('italic'), run: () => editor.chain().focus().toggleItalic().run() },
        { label: 'H2', title: 'Heading', isActive: editor.isActive('heading', { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
        { label: '• list', title: 'Bullet list', isActive: editor.isActive('bulletList'), run: () => editor.chain().focus().toggleBulletList().run() },
        { label: '1. list', title: 'Numbered list', isActive: editor.isActive('orderedList'), run: () => editor.chain().focus().toggleOrderedList().run() },
      ] as const)
    : [];
  return (
    <div className="flex flex-col gap-3 rounded-sm border border-[#cfc7b6] bg-[#f4f0e8] p-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold uppercase tracking-wider text-[#7a5a1c]">Subject</span>
        <input
          type="text"
          value={subject}
          onChange={(changeEvent) => {
            setSubject(changeEvent.target.value);
            setSaveState('idle');
          }}
          className="rounded-sm border border-[#ddd6c8] bg-white px-3 py-2 text-lg text-[#1f1c18] outline-none focus:border-[#b99a5e]"
        />
      </label>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold uppercase tracking-wider text-[#7a5a1c]">Body</span>
        <div className="flex flex-wrap items-center gap-1">
          {toolbarActions.map((action) => (
            <button
              key={action.label}
              type="button"
              title={action.title}
              onClick={action.run}
              className={`${adminButtonClassName} ${action.isActive ? 'bg-[#e8d7b0]' : ''}`}
            >
              {action.label}
            </button>
          ))}
        </div>
        <EditorContent
          editor={editor}
          className="min-h-40 [&_.tiptap]:min-h-40 [&_.tiptap]:rounded-sm [&_.tiptap]:border [&_.tiptap]:border-[#ddd6c8] [&_.tiptap]:bg-white [&_.tiptap]:p-3 [&_.tiptap]:text-lg [&_.tiptap]:text-[#1f1c18] [&_.tiptap]:outline-none [&_.tiptap_p]:my-2 [&_.tiptap_h2]:text-xl [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6"
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className={hasLinkPlaceholder ? 'text-[#2f6b33]' : 'text-[#a33a3a]'}>
          <code className="rounded-sm bg-white px-1 py-0.5 font-mono text-xs">{INVITE_LINK_PLACEHOLDER}</code>{' '}
          {hasLinkPlaceholder ? '— the link goes here' : '— not found; the link will be added at the end'}
        </span>
        <span className={hasNamePlaceholder ? 'text-[#2f6b33]' : adminMutedClassName}>
          <code className="rounded-sm bg-white px-1 py-0.5 font-mono text-xs">{INVITEE_NAME_PLACEHOLDER}</code>{' '}
          {hasNamePlaceholder ? '— their name goes here' : '— not used; the email has no greeting'}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {isUnsavedNudgeDraft && saveState !== 'saved' && (
          <span className="text-sm text-[#8a6d1c]">
            This is a starter draft in our words, not yours — read it through, make it sound like you,
            then Save. Nothing sends until you do.
          </span>
        )}
        <span className="grow" />
        <span className={`text-sm ${saveState === 'error' ? 'text-[#a33a3a]' : adminMutedClassName}`}>
          {saveState === 'saving' ? 'saving…' : saveState === 'saved' ? 'saved' : saveState === 'error' ? 'save failed — try again' : ''}
        </span>
        <button type="button" onClick={saveEmail} disabled={!editor || saveState === 'saving'} className={adminButtonClassName}>
          Save
        </button>
      </div>
      {/* Nothing else on this page shows what actually lands in an inbox — the
          appended link, how a mail client renders this HTML, whether it reads
          as spam. Sending one to ourselves is the only honest check. */}
      <div className="flex flex-wrap items-center gap-3 border-t border-[#ddd6c8] pt-3">
        <span className="text-sm font-semibold uppercase tracking-wider text-[#7a5a1c]">
          Send a test
        </span>
        <input
          type="email"
          value={testAddress}
          placeholder="your@email.com"
          onChange={(changeEvent) => setTestAddress(changeEvent.target.value)}
          className="rounded-sm border border-[#ddd6c8] bg-white px-3 py-1 text-base text-[#1f1c18] outline-none focus:border-[#b99a5e]"
        />
        <button
          type="button"
          onClick={() => void sendTest()}
          disabled={isTesting || testAddress.trim() === ''}
          title="Sends the saved text — save first if you have just edited it. The link in a test is a dead token."
          className={adminButtonClassName}
        >
          {isTesting ? 'Sending…' : 'Send test'}
        </button>
        <span className={`text-sm ${testReport?.startsWith('Not sent') ? 'text-[#a33a3a]' : adminMutedClassName}`}>
          {testReport ?? 'sends the last saved version, with a dead invite link'}
        </span>
      </div>
    </div>
  );
};

export default InvitationEmailEditor;
