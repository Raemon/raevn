'use client';

import { useEffect, useState, type ReactNode } from 'react';

// The ledger is four tables and two editors; stacked they made one page you
// had to scroll for a minute to reach the menu. Tabs put each one an inch
// away, and the panels stay mounted so a half-written invitation letter or a
// half-dragged column order survives a trip to another tab.

const ACTIVE_TAB_STORAGE_KEY = 'admin.activeTab';

export type AdminTabDefinition = {
  id: string;
  label: string;
  // Live counts come from AdminRowsProvider, so a tab's badge is a node
  // rather than a number the server would have frozen at page load.
  count?: ReactNode;
  panel: ReactNode;
};

const AdminTabs = ({ tabs }: { tabs: AdminTabDefinition[] }) => {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? '');
  // The tab list arrives as a fresh array of elements every render; its ids are
  // what the restore below actually depends on.
  const tabIds = tabs.map((tab) => tab.id).join(',');

  // Restoring after the first paint, not during it, so the server and client
  // agree on the first render. The tab you were on survives a reload.
  useEffect(() => {
    const savedId = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (savedId && tabIds.split(',').includes(savedId)) setActiveId(savedId);
  }, [tabIds]);

  const selectTab = (tabId: string) => {
    setActiveId(tabId);
    window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tabId);
  };

  return (
    <div>
      <div role="tablist" className="mb-6 flex flex-wrap gap-1 border-b border-[#cfc7b6]">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`admin-panel-${tab.id}`}
              onClick={() => selectTab(tab.id)}
              className={`-mb-px cursor-pointer rounded-t-sm border border-b-0 px-4 py-2 text-base font-medium transition-colors ${
                isActive
                  ? 'border-[#cfc7b6] bg-[#faf8f4] text-[#1f1c18]'
                  : 'border-transparent text-[#6f6a61] hover:text-[#7a5a1c]'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 text-sm font-medium text-[#7a5a1c]">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`admin-panel-${tab.id}`}
          role="tabpanel"
          hidden={tab.id !== activeId}
          className="pb-14"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
};

export default AdminTabs;
