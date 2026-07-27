'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { adminButtonClassName, adminMutedClassName } from './adminTableStyles';
import { INVITE_LINK_PLACEHOLDER, type InvitationEmail } from '@/lib/invitationEmail';

// The invitation email itself — its own subject and body, written here and sent
// verbatim by the Send buttons below. Deliberately separate from the invitation
// letter above: the letter is what the invite page shows, this is what lands in
// the inbox. Styled like the rest of /admin rather than like the invite page,
// because mail clients won't render the invite page's typography anyway.

const InvitationEmailEditor = ({ initialEmail }: { initialEmail: InvitationEmail }) => {
  const router = useRouter();
  const [subject, setSubject] = useState(initialEmail.subject);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialEmail.bodyHtml ?? '',
    immediatelyRender: false,
    onUpdate: () => setSaveState('idle'),
  });
  const saveEmail = async () => {
    if (!editor) return;
    setSaveState('saving');
    const response = await fetch('/api/admin/invitation-email', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, bodyHtml: editor.isEmpty ? null : editor.getHTML() }),
    }).catch(() => null);
    setSaveState(response?.ok ? 'saved' : 'error');
    // The Send buttons are gated on this body existing, and that gate is
    // computed on the server — without a refresh they'd stay greyed out until
    // a manual reload.
    if (response?.ok) router.refresh();
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
      <div className="flex items-center gap-3">
        <span className={`text-sm ${adminMutedClassName}`}>
          Type <code className="rounded-sm bg-white px-1 py-0.5 font-mono text-xs">{INVITE_LINK_PLACEHOLDER}</code> where
          the guest&rsquo;s personal invite link should go — left out, it&rsquo;s added at the end.
        </span>
        <span className="grow" />
        <span className={`text-sm ${saveState === 'error' ? 'text-[#a33a3a]' : adminMutedClassName}`}>
          {saveState === 'saving' ? 'saving…' : saveState === 'saved' ? 'saved' : saveState === 'error' ? 'save failed — try again' : ''}
        </span>
        <button type="button" onClick={saveEmail} disabled={!editor || saveState === 'saving'} className={adminButtonClassName}>
          Save
        </button>
      </div>
    </div>
  );
};

export default InvitationEmailEditor;
