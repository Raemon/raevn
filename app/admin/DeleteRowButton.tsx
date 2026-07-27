'use client';

import { useEffect, useState } from 'react';
import { adminButtonClassName } from './adminTableStyles';

// Two-step delete. The × only arms the row; the deletion itself happens in a
// centred confirmation that names the row, so a mis-aimed click in a dense
// table can't remove someone. Escape, Cancel, or a click on the backdrop
// disarms it. onDelete returns false to keep the dialog open with an error.

const DeleteRowButton = ({
  label,
  description,
  onDelete,
}: {
  label: string;
  description: string;
  onDelete: () => Promise<boolean>;
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [didFail, setDidFail] = useState(false);

  useEffect(() => {
    if (!isConfirming) return;
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') setIsConfirming(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isConfirming]);

  const confirmDelete = async () => {
    setIsDeleting(true);
    const deleted = await onDelete();
    setIsDeleting(false);
    if (deleted) setIsConfirming(false);
    else setDidFail(true);
  };

  return (
    <>
      <button
        type="button"
        title={`Delete ${label}`}
        aria-label={`Delete ${label}`}
        onClick={() => {
          setDidFail(false);
          setIsConfirming(true);
        }}
        className="cursor-pointer rounded-sm px-2 py-1 text-lg leading-none text-[#a89f8c] transition-colors hover:bg-[#f6e5e5] hover:text-[#a33a3a]"
      >
        ×
      </button>
      {isConfirming && (
        <div
          role="dialog"
          aria-modal
          onClick={() => setIsConfirming(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f1c18]/30 px-6"
        >
          <div
            onClick={(clickEvent) => clickEvent.stopPropagation()}
            className="w-full max-w-md rounded-sm border border-[#cfc7b6] bg-[#faf8f4] px-6 py-5 text-left shadow-lg"
          >
            <p className="text-xl font-semibold text-[#1f1c18]">Are you sure?</p>
            <p className="mt-2 text-base text-[#6f6a61]">
              {description} <span className="font-medium text-[#1f1c18]">{label}</span>. This can&apos;t be
              undone.
            </p>
            {didFail && (
              <p className="mt-2 text-base font-medium text-[#a33a3a]">
                Delete failed — nothing was removed.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                className={adminButtonClassName}
                disabled={isDeleting}
                onClick={() => setIsConfirming(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                autoFocus
                className="cursor-pointer whitespace-nowrap rounded-sm border border-[#a33a3a] bg-[#a33a3a] px-3 py-1 text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-[#8c3030] disabled:cursor-default disabled:opacity-40"
                disabled={isDeleting}
                onClick={confirmDelete}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeleteRowButton;
