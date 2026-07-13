// Local dev is always open; production requires the ADMIN_KEY (and refuses
// everyone if ADMIN_KEY isn't configured). Shared by /admin and its API routes.

export const isAdminAuthorized = (candidateKey: string | null | undefined): boolean => {
  const adminKey = process.env.ADMIN_KEY;
  return process.env.NODE_ENV !== 'production' || (!!adminKey && candidateKey === adminKey);
};
