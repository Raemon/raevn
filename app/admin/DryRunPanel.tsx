'use client';

import { useState } from 'react';
import type { DryRunLevel, DryRunReport } from '../api/admin/dry-run-invitations/route';
import { adminButtonClassName, adminMutedClassName } from './adminTableStyles';

// Everything the send would check, checked without sending — the same module
// that backs scripts/dry-run-invitations.mjs. Worth a click before any batch:
// the things it catches (an address that isn't one, two people on one inbox, a
// placeholder that silently didn't take) are all cheaper to read here than to
// discover in a reply.

const LEVEL_ORDER: DryRunLevel[] = ['blocker', 'error', 'warn', 'ok'];

const LEVEL_STYLE: Record<DryRunLevel, { mark: string; className: string }> = {
  blocker: { mark: 'BLOCKER', className: 'text-[#a33a3a] font-semibold' },
  error: { mark: 'ERROR', className: 'text-[#a33a3a]' },
  warn: { mark: 'WARN', className: 'text-[#8a6d1c]' },
  ok: { mark: 'OK', className: 'text-[#2f6b33]' },
};

const DryRunPanel = () => {
  const [report, setReport] = useState<DryRunReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setIsRunning(true);
    setError(null);
    const response = await fetch('/api/admin/dry-run-invitations').catch(() => null);
    if (!response?.ok) {
      setError('Dry run failed to load.');
      setIsRunning(false);
      return;
    }
    setReport((await response.json()) as DryRunReport);
    setIsRunning(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void run()} disabled={isRunning} className={adminButtonClassName}>
          {isRunning ? 'Checking…' : report ? 'Re-run dry run' : 'Dry run'}
        </button>
        <span className={`text-sm ${error ? 'text-[#a33a3a]' : adminMutedClassName}`}>
          {error ??
            (report
              ? `${report.plan.wouldSend} would be sent · ${report.plan.alreadySent} already sent · ${report.plan.blocked.length} blocked`
              : 'checks everything a send would check, and sends nothing')}
        </span>
      </div>

      {report && (
        <div className="flex flex-col gap-2 rounded-sm border border-[#cfc7b6] bg-[#f4f0e8] p-4">
          {LEVEL_ORDER.flatMap((level) =>
            report.findings
              .filter((finding) => finding.level === level)
              .map((finding, index) => (
                <div key={`${level}-${index}`} className="flex gap-3 text-sm">
                  <span className={`w-16 shrink-0 font-mono text-xs uppercase ${LEVEL_STYLE[level].className}`}>
                    {LEVEL_STYLE[level].mark}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className={LEVEL_STYLE[level].className}>{finding.title}</span>
                    <span className={`whitespace-pre-wrap ${adminMutedClassName}`}>{finding.detail}</span>
                  </span>
                </div>
              )),
          )}

          {report.sample && (
            <details className="mt-2 border-t border-[#ddd6c8] pt-2 text-sm">
              <summary className={`cursor-pointer ${adminMutedClassName}`}>
                What one of them would receive (plain-text part, to {report.sample.to})
              </summary>
              <p className="mt-2 font-semibold">{report.sample.subject}</p>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-[#1f1c18]">{report.sample.text}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default DryRunPanel;
