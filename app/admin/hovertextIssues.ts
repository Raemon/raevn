import type { InviteeAdminRow } from './adminRowTypes';

// Every diagram hovertext is signed by whoever wrote it — "– Ray" or
// "– Elizabeth" — and the side blend says which of us should have written it.
// These checks flag the ones that break that shape so they stand out red in
// the admin table instead of having to be re-read one by one.

// Any dash flavour counts as the signature dash: an em dash or a plain hyphen
// is a typo in the glyph, not a missing signature, and flagging it as
// "unsigned" would point at the wrong problem.
const SIGNATURE_END = /[-–—]\s*(Ray|Elizabeth)\s*[.!]?$/;
const RAY_SIGNATURE = /[-–—]\s*Ray\b/;
const ELIZABETH_SIGNATURE = /[-–—]\s*Elizabeth\b/;

// A blank line starts a new paragraph; a single line break inside one does not.
// That distinction is the whole of rule (b): a signature written on its own
// line still belongs to the paragraph above it, and only a paragraph that ends
// without any signature is a real break in the pattern.
const paragraphs = (text: string): string[] =>
  text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '');

export const hovertextIssues = (row: InviteeAdminRow): string[] => {
  const text = row.diagramHovertext?.trim() ?? '';
  // An unwritten hovertext is already obvious from the empty cell; red is
  // reserved for text that exists and is wrong.
  if (text === '') return [];

  const issues: string[] = [];
  const blocks = paragraphs(text);
  const hasRay = RAY_SIGNATURE.test(text);
  const hasElizabeth = ELIZABETH_SIGNATURE.test(text);

  if (!hasRay && !hasElizabeth) issues.push('No “– Ray” or “– Elizabeth” signature');

  // Every paragraph but the last is followed by a break, so it should have been
  // signed off before the next one started.
  const unsignedBreaks = blocks.slice(0, -1).filter((block) => !SIGNATURE_END.test(block)).length;
  if (unsignedBreaks > 0) {
    issues.push(
      `${unsignedBreaks} paragraph${unsignedBreaks === 1 ? '' : 's'} ends without a signature`,
    );
  }

  if (row.sideBlend < 0.5 && !hasRay) issues.push(`Side blend ${row.sideBlend} (Ray’s side) but no “– Ray”`);
  if (row.sideBlend > 0.5 && !hasElizabeth) {
    issues.push(`Side blend ${row.sideBlend} (Elizabeth’s side) but no “– Elizabeth”`);
  }

  return issues;
};
