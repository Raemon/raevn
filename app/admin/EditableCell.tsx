'use client';

import { useEffect, useRef, useState } from 'react';
import { adminMutedClassName } from './adminTableStyles';

// Double-click to edit, blur (or Enter) to save, Escape to cancel. onCommit
// persists to the database and returns false to reject the edit (the cell
// then reverts to its previous value).

const EditableCell = ({
  value,
  placeholder = '—',
  className = '',
  onCommit,
}: {
  value: string;
  placeholder?: string;
  className?: string;
  onCommit: (nextValue: string) => Promise<boolean>;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const cancelledRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!isEditing) return;
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
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(changeEvent) => setDraft(changeEvent.target.value)}
        onBlur={commitDraft}
        onKeyDown={(keyEvent) => {
          if (keyEvent.key === 'Enter') inputRef.current?.blur();
          if (keyEvent.key === 'Escape') {
            cancelledRef.current = true;
            inputRef.current?.blur();
          }
        }}
        className="w-full min-w-24 rounded-sm border border-[#b99a5e] bg-white px-2 py-1 text-base text-[#1f1c18] outline-none focus:border-[#7a5a1c]"
      />
    );
  }
  return (
    <span
      onDoubleClick={beginEditing}
      title="Double-click to edit"
      className={`block min-h-6 cursor-text ${isSaving ? 'opacity-50' : ''} ${className}`}
    >
      {value !== '' ? value : <span className={adminMutedClassName}>{placeholder}</span>}
    </span>
  );
};

export default EditableCell;
