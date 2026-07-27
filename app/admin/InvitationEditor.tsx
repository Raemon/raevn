'use client';

import { useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { adminButtonClassName, adminMutedClassName } from './adminTableStyles';

// Hosts write invitations themselves here; the saved HTML is what the guest's
// /invite/[token] page renders. `persist` decides where the HTML goes — a
// specific invitee's letter or the site-wide default.

const InvitationEditor = ({
  initialHtml,
  persist,
}: {
  initialHtml: string | null;
  persist: (invitationHtml: string | null) => Promise<boolean>;
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
    const didSave = await persist(invitationHtml);
    setSaveState(didSave ? 'saved' : 'error');
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
    <div className="flex flex-col gap-2 rounded-sm border border-[#cfc7b6] bg-[#f4f0e8] p-3">
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
        <span className="grow" />
        <span className={`text-sm ${saveState === 'error' ? 'text-[#a33a3a]' : adminMutedClassName}`}>
          {saveState === 'saving' ? 'saving…' : saveState === 'saved' ? 'saved' : saveState === 'error' ? 'save failed — try again' : ''}
        </span>
        <button type="button" onClick={saveInvitation} disabled={!editor || saveState === 'saving'} className={adminButtonClassName}>
          Save
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="min-h-32 [&_.tiptap]:min-h-32 [&_.tiptap]:rounded-sm [&_.tiptap]:border [&_.tiptap]:border-[#ddd6c8] [&_.tiptap]:bg-white [&_.tiptap]:p-3 [&_.tiptap]:text-lg [&_.tiptap]:text-[#1f1c18] [&_.tiptap]:outline-none [&_.tiptap_p]:my-2 [&_.tiptap_h2]:text-xl [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6"
      />
    </div>
  );
};

export default InvitationEditor;
