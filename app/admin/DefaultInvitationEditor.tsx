'use client';

import { useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cormorant } from '../handfasting-simple/save-the-date/handfastingInvitationTypography';

// Edits the site-wide default invitation letter — the one sent to every
// invitee who doesn't have a personal letter written. The editing surface
// reuses the invite page's exact typography classes (see Handfasting2), so
// what the host types here is what the guest's page renders.

// Mirrors the invitation letter styling in Handfasting2.tsx — keep in sync.
const inviteLetterClassName =
  'w-full text-[clamp(1.05rem,1.8vw,1.3rem)] font-light leading-relaxed text-[#e9e3d4] [&_p]:my-8 [&_h1]:text-3xl [&_h2]:text-2xl [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l [&_blockquote]:border-white/30 [&_blockquote]:pl-4 [&_blockquote]:italic';

const toolbarButtonClassName =
  'bg-transparent text-xs uppercase tracking-[0.2em] transition-colors hover:text-[#e9e3d4]';

const DefaultInvitationEditor = ({
  initialHtml,
  adminKey,
}: {
  initialHtml: string | null;
  adminKey: string | null;
}) => {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialHtml ?? '',
    immediatelyRender: false,
    onUpdate: () => setSaveState('idle'),
  });
  const saveInvitation = async () => {
    if (!editor) return;
    setSaveState('saving');
    const invitationHtml = editor.isEmpty ? null : editor.getHTML();
    const response = await fetch('/api/admin/default-invitation', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationHtml, key: adminKey ?? '' }),
    }).catch(() => null);
    setSaveState(response?.ok ? 'saved' : 'error');
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
    <div className="overflow-hidden rounded-md bg-[#0c0b09] bg-gradient-to-b from-[#181410] to-[#0c0b09]">
      <div
        className="cursor-text px-6 py-12 sm:px-12"
        onClick={() => editor?.chain().focus().run()}
      >
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 text-center">
          <p className={`${cormorant.className} m-0 text-[clamp(1.2rem,2vw,1.6rem)] font-light italic tracking-[0.04em] text-[#e9e3d4]`}>
            Dear Guest,
          </p>
          <EditorContent
            editor={editor}
            onClick={(clickEvent) => clickEvent.stopPropagation()}
            className={`${cormorant.className} ${inviteLetterClassName} [&_.tiptap]:min-h-24 [&_.tiptap]:outline-none [&_.tiptap]:caret-[#e9e3d4]`}
          />
        </div>
      </div>
      <div className="flex items-center gap-4 border-t border-white/10 px-6 py-2.5 sm:px-12">
        {toolbarActions.map((action) => (
          <button
            key={action.label}
            type="button"
            title={action.title}
            onClick={action.run}
            className={`${toolbarButtonClassName} ${action.isActive ? 'text-[#e9e3d4]' : 'text-[#6f685c]'}`}
          >
            {action.label}
          </button>
        ))}
        <span className="grow" />
        <span className={`text-xs tracking-wide ${saveState === 'error' ? 'text-[#c96a5a]' : 'text-[#6f685c]'}`}>
          {saveState === 'saving' ? 'saving…' : saveState === 'saved' ? 'saved' : saveState === 'error' ? 'save failed — try again' : ''}
        </span>
        <button
          type="button"
          onClick={saveInvitation}
          disabled={!editor || saveState === 'saving'}
          className={`${toolbarButtonClassName} font-medium text-[#c9a85c] hover:text-[#e9d9ae] disabled:opacity-50`}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default DefaultInvitationEditor;
