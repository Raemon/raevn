'use client';

import { useEffect, useState } from 'react';
import type { MenuOptionPreview } from './partyRegistrationTypes';

// Fetched once per page for the diet picker's hover previews; a failed
// fetch just means the picker shows no previews.
export const useMenuOptionPreviews = (): MenuOptionPreview[] => {
  const [menuOptions, setMenuOptions] = useState<MenuOptionPreview[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/handfasting-simple/menu-options')
      .then((response) => (response.ok ? (response.json() as Promise<MenuOptionPreview[]>) : []))
      .then((fetchedOptions) => {
        if (!cancelled && Array.isArray(fetchedOptions)) setMenuOptions(fetchedOptions);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return menuOptions;
};
