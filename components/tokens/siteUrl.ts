/* The address a published doc site actually lives at.

   Sites are stored as a bare domain ("docs.acme.com"). Several places offered
   to open one and linked to "#" instead, which focuses and clicks like a link
   and goes nowhere. One helper so the scheme is decided once: a bare domain is
   https, and anything already carrying a scheme is passed through, since a
   local or staging site may legitimately be http or carry a port. */
export function siteUrl(domain: string): string {
  const d = domain.trim();
  if (!d) return "";
  return /^https?:\/\//i.test(d) ? d : `https://${d}`;
}
