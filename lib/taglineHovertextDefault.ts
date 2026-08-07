// Split from taglineHovertext.ts so the invite page (a client component) can
// import the fallback text without pulling Prisma into the browser bundle.

export const TAGLINE_HOVERTEXT_SETTING_KEY = 'taglineHovertext';

// Shown when someone hovers "iterated exponential kickstarter of love" in the
// hero subtitle. Editable on /admin; this is what an unedited site says.
export const DEFAULT_TAGLINE_HOVERTEXT =
  "Last time, we committed to each other for 1 year and 1 day. This time we're committing for 10 years and 10 days."
 