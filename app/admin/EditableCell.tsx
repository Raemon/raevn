'use client';

import { useEffect, useRef, useState } from 'react';
import { adminMutedClassName } from './adminTableStyles';

// Double-click to edit, blur (or Enter) to save, Escape to cancel. onCommit
// persists to the database and returns false to reject the edit (the cell
// then reverts to its previous value).

// The editing box is a textarea that inherits the cell's own type size and
// grows to whatever the text needs, so a long value (a note, a diagram
// hovertext) reads the same while being edited as it does once saved —
// rather than shrinking into one horizontally scrolling line.
const fitHeightToContent = (element: HTMLTextAreaElement | null) => {
  if (!element) return;
  element.style.height = 'auto';
  // scrollHeight covers content and padding but not the border, which
  // border-box sizing would otherwise take back out of the height we set.
  const borderHeight = element.offsetHeight - element.clientHeight;
  element.style.height = `${element.scrollHeight + borderHeight}px`;
};

const EditableCell = ({
  value,
  displayValue,
  placeholder = '—',
  className = '',
  title,
  onCommit,
}: {
  value: string;
  // What the cell reads as when it isn't being edited, when that differs from
  // the raw text an edit starts from (a side blend shows whose side it leans
  // toward; typing still starts from the bare number).
  displayValue?: string;
  placeholder?: string;
  className?: string;
  // Replaces the default "Double-click to edit" hint when the cell has
  // something more urgent to say (why it is flagged, say).
  title?: string;
  onCommit: (nextValue: string) => Promise<boolean>;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const cancelledRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!isEditing) return;
    fitHeightToContent(inputRef.current);
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing]);
  const beginEditing = () => {
    setDraft(value);
    cancelledRef.current = false;
    setIsEditing(true);
  };
  const commitDraft = async () => {
    setIsEditing(false);
    if (cancelledRef.current || draft === value) return;
    setIsSaving(true);
    try {
      await onCommit(draft);
    } finally {
      setIsSaving(false);
    }
  };
  if (isEditing) {
    return (
      <textarea
        ref={inputRef}
        rows={1}
        value={draft}
        onChange={(changeEvent) => {
          setDraft(changeEvent.target.value);
          fitHeightToContent(changeEvent.target);
        }}
        onBlur={commitDraft}
        onKeyDown={(keyEvent) => {
          // Enter still saves, the way it did when this was one line; a
          // deliberate Shift+Enter is the way to write a second line.
          if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
            keyEvent.preventDefault();
            inputRef.current?.blur();
          }
          if (keyEvent.key === 'Escape') {
            cancelledRef.current = true;
            inputRef.current?.blur();
          }
        }}
        className="w-full min-w-24 resize-none overflow-hidden rounded-sm border border-[#b99a5e] bg-white px-2 py-1 leading-[inherit] text-[#1f1c18] outline-none focus:border-[#7a5a1c]"
      />
    );
  }
  return (
    <span
      onDoubleClick={beginEditing}
      title={title ?? 'Double-click to edit'}
      // A value that was typed across lines reads back across the same lines;
      // set only when there are newlines, so the columns that ask for one
      // unbroken line (email) keep it.
      style={value.includes('\n') ? { whiteSpace: 'pre-wrap' } : undefined}
      className={`block min-h-6 cursor-text ${isSaving ? 'opacity-50' : ''} ${className}`}
    >
      {value !== '' ? (
        (displayValue ?? value)
      ) : (
        <span className={adminMutedClassName}>{placeholder}</span>
      )}
    </span>
  );
};

export default EditableCell;
