'use client';

import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { adminMutedClassName } from '../admin/adminTableStyles';

// One person, one letter, written straight onto the page: no chrome, a balloon
// toolbar on text selection, and automatic saves (debounced, plus on blur).

const AUTOSAVE_DELAY_MS = 1200;

const balloonButtonClassName = (isActive: boolean) =>
  `cursor-pointer rounded-sm px-1.5 py-0.5 text-xs tracking-widest ${
    isActive ? 'bg-[#c9a05e]/25 text-[#e8c98a]' : 'text-[#c9a05e] hover:bg-[#c9a05e]/10'
  }`;

const LetterCard = ({
  inviteeId,
  name,
  note,
  invitationSentAt,
  initialHtml,
  adminKey,
}: {
  inviteeId: string;
  name: string;
  note: string | null;
  invitationSentAt: string | null;
  initialHtml: string | null;
  adminKey: string | null;
}) => {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = async (letterEditor: Editor) => {
    setSaveState('saving');
    const invitationHtml = letterEditor.isEmpty ? null : letterEditor.getHTML();
    const response = await fetch(`/api/admin/invitees/${inviteeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationHtml, key: adminKey ?? '' }),
    }).catch(() => null);
    setSaveState(response?.ok ? 'saved' : 'error');
  };

  const queuePersist = (letterEditor: Editor) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      persist(letterEditor);
    }, AUTOSAVE_DELAY_MS);
  };

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: 'no letter yet — start writing…' })],
    content: initialHtml ?? '',
    immediatelyRender: false,
    onUpdate: ({ editor: letterEditor }) => queuePersist(letterEditor),
    onBlur: ({ editor: letterEditor }) => {
      // Flush a pending autosave; an untouched editor has nothing queued.
      if (!saveTimer.current) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      persist(letterEditor);
    },
  });

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const activeMarks = useEditorState({
    editor,
    selector: ({ editor: letterEditor }) =>
      letterEditor
        ? {
            bold: letterEditor.isActive('bold'),
            italic: letterEditor.isActive('italic'),
            heading: letterEditor.isActive('heading', { level: 2 }),
            bulletList: letterEditor.isActive('bulletList'),
          }
        : null,
  });

  return (
    <section className="py-8">
      <div className="flex items-baseline gap-3">
        <h2 className="text-2xl font-medium">{name}</h2>
        {invitationSentAt && (
          <span className={`text-xs italic ${adminMutedClassName}`}>
            sent {new Date(invitationSentAt).toLocaleDateString()}
          </span>
        )}
        <span className="grow" />
        <span className={`text-xs italic ${saveState === 'error' ? 'text-[#c98d8d]' : adminMutedClassName}`}>
          {saveState === 'saving' ? 'saving…' : saveState === 'saved' ? 'saved' : saveState === 'error' ? 'save failed' : ''}
        </span>
      </div>
      {note && <p className={`mt-1 text-sm italic ${adminMutedClassName}`}>{note}</p>}

      {editor && activeMarks && (
        <BubbleMenu
          editor={editor}
          options={{ placement: 'top', offset: 8 }}
          className="flex items-center gap-0.5 rounded-md border border-[#c9a05e]/30 bg-[#171310] px-1 py-0.5 shadow-lg shadow-black/50"
        >
          <button type="button" title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} className={balloonButtonClassName(activeMarks.bold)}>
            B
          </button>
          <button type="button" title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} className={`${balloonButtonClassName(activeMarks.italic)} italic`}>
            I
          </button>
          <button type="button" title="Heading" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={balloonButtonClassName(activeMarks.heading)}>
            H2
          </button>
          <button type="button" title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} className={balloonButtonClassName(activeMarks.bulletList)}>
            • list
          </button>
        </BubbleMenu>
      )}

      <EditorContent
        editor={editor}
        className="mt-3 [&_.tiptap]:min-h-10 [&_.tiptap]:text-lg [&_.tiptap]:leading-relaxed [&_.tiptap]:text-[#e6dfd0] [&_.tiptap]:outline-none [&_.tiptap_p]:my-1.5 [&_.tiptap_h2]:mt-3 [&_.tiptap_h2]:text-xl [&_.tiptap_h2]:font-medium [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6"
      />
    </section>
  );
};

export default LetterCard;
