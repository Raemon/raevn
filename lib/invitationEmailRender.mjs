// Turning a written email body into the two parts that actually get sent.
// Plain .mjs with JSDoc types rather than TypeScript, because the dry-run
// script runs under bare `node` and has to render exactly what the app sends —
// a second copy of these rules is precisely the thing a dry run can't have.

/** Where the guest's personal link goes in the body; appended if left out. */
export const INVITE_LINK_PLACEHOLDER = '{{link}}';
/** Where their name goes; simply dropped if left out, since a greeting is a
 *  choice rather than something the email is broken without. */
export const INVITEE_NAME_PLACEHOLDER = '{{name}}';

/**
 * @param {string} text
 * @returns {string}
 */
const escapeHtml = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * The link is a plain anchor so it survives every mail client. It has to be
 * *inline*: the placeholder usually sits mid-sentence inside a TipTap
 * paragraph, and substituting a block <p> there makes the parser close the
 * paragraph early and orphan everything after it into a stray fragment.
 * Only the fallback — no placeholder at all — appends its own paragraph.
 *
 * @param {string} bodyHtml
 * @param {{ name: string, inviteUrl: string }} fields
 * @returns {string}
 */
export function renderInvitationEmailBody(bodyHtml, { name, inviteUrl }) {
  const safeUrl = escapeHtml(inviteUrl);
  const inlineLink = `<a href="${safeUrl}">${safeUrl}</a>`;
  const withName = bodyHtml.replaceAll(INVITEE_NAME_PLACEHOLDER, escapeHtml(name));
  return withName.includes(INVITE_LINK_PLACEHOLDER)
    ? withName.replaceAll(INVITE_LINK_PLACEHOLDER, inlineLink)
    : `${withName}\n<p>${inlineLink}</p>`;
}

/**
 * A plain-text alternative ships with every send: a lone text/html part is a
 * real spam-score penalty for a batch going out from a consumer Gmail account,
 * and some clients still prefer text. Derived from the rendered HTML so the
 * two parts can never drift apart.
 *
 * @param {string} bodyHtml
 * @param {{ name: string, inviteUrl: string }} fields
 * @returns {string}
 */
export function renderInvitationEmailText(bodyHtml, fields) {
  return renderInvitationEmailBody(bodyHtml, fields)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h[1-6]|li|blockquote|div)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '  • ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
