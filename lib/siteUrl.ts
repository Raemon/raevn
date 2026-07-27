// Public site URL for invite links in emails. Falls back to production so
// sending from local dev still emails raevn.love links.
export const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://raevn.love';
