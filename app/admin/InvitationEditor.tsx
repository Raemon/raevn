'use client';

import { useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { adminButtonClassName, adminMutedClassName } from './adminTableStyles';

// Hosts write each invitation themselves here; the saved HTML is what the
// guest's /invite/[token] page renders.

const InvitationEditor = ({
  inviteeId,
  initialHtml,
  adminKey,
  onSaved,
}: {
  inviteeId: string;
  initialHtml: string | null;
  adminKey: string | null;
  onSaved: (invitationHtml: string | null) => void;
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
    const response = await fetch(`/api/admin/invitees/${inviteeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationHtml, key: adminKey ?? '' }),
    }).catch(() => null);
    if (response?.ok) {
      setSaveState('saved');
      onSaved(invitationHtml);
    } else {
      setSaveState('error');
    }
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
    <div className="flex flex-col gap-2 rounded-sm border border-[#c9a05e]/25 bg-[#12100d] p-3">
      <div className="flex flex-wrap items-center gap-1">
        {toolbarActions.map((action) => (
          <button
            key={action.label}
            type="button"
            title={action.title}
            onClick={action.run}
            className={`${adminButtonClassName} ${action.isActive ? 'bg-[#c9a05e]/20' : ''}`}
          >
            {action.label}
          </button>
        ))}
        <span className="grow" />
        <span className={`text-xs italic ${saveState === 'error' ? 'text-[#c98d8d]' : adminMutedClassName}`}>
          {saveState === 'saving' ? 'saving…' : saveState === 'saved' ? 'saved' : saveState === 'error' ? 'save failed — try again' : ''}
        </span>
        <button type="button" onClick={saveInvitation} disabled={!editor || saveState === 'saving'} className={adminButtonClassName}>
          Save
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="min-h-32 [&_.tiptap]:min-h-32 [&_.tiptap]:rounded-sm [&_.tiptap]:bg-[#0b0a09] [&_.tiptap]:p-3 [&_.tiptap]:text-base [&_.tiptap]:text-[#e6dfd0] [&_.tiptap]:outline-none [&_.tiptap_p]:my-2 [&_.tiptap_h2]:text-xl [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6"
      />
    </div>
  );
};

export default InvitationEditor;
