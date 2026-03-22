/**
 * HTML entity name → character mapping
 */
const HTML_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  copy: '\u00A9',
  reg: '\u00AE',
  trade: '\u2122',
  mdash: '\u2014',
  ndash: '\u2013',
  laquo: '\u00AB',
  raquo: '\u00BB',
  bull: '\u2022',
  hellip: '\u2026',
};

/**
 * Decode HTML entities (named, decimal, hex)
 */
function decodeHtmlEntities(text: string): string {
  return text
    // Named entities: &amp; &nbsp; etc.
    .replace(/&([a-zA-Z]+);/g, (_, name) => {
      return HTML_ENTITIES[name.toLowerCase()] ?? `&${name};`;
    })
    // Decimal numeric entities: &#123;
    .replace(/&#(\d+);/g, (_, digits) => {
      return String.fromCharCode(parseInt(digits, 10));
    })
    // Hex numeric entities: &#x1F;
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
}

/**
 * Strip all HTML tags
 */
function stripHtmlTags(text: string): string {
  // Replace <br>, <br/>, <br /> with newline before stripping
  let result = text.replace(/<br\s*\/?>/gi, '\n');
  // Replace block-level closing tags with newline
  result = result.replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n');
  // Strip all remaining tags
  result = result.replace(/<\/?[^>]+(>|$)/g, '');
  return result;
}

/**
 * Strip RTF formatting codes
 */
function stripRtfCodes(text: string): string {
  // Remove RTF groups: {\rtf1 ...}, {\fonttbl ...}, etc.
  let result = text.replace(/\{\\[^}]*\}/g, '');
  // Remove RTF control words: \b, \i, \fs24, \par, etc.
  result = result.replace(/\\[a-z]+\d*\s?/g, '');
  // Remove RTF special chars: \{, \}, \\
  result = result.replace(/\\[{}\\]/g, '');
  return result;
}

/**
 * Remove zero-width and invisible characters
 */
function removeInvisibleChars(text: string): string {
  return text.replace(/[\u200B\u200C\u200D\u00AD\uFEFF\u2060\u200E\u200F]/g, '');
}

/**
 * Normalize whitespace
 */
function normalizeWhitespace(text: string): string {
  // Replace multiple spaces/tabs on each line with a single space
  let result = text.replace(/[^\S\n]+/g, ' ');
  // Normalize line endings
  result = result.replace(/\r\n/g, '\n');
  // Collapse 3+ consecutive newlines to 2 (one blank line)
  result = result.replace(/\n{3,}/g, '\n\n');
  // Trim each line
  result = result
    .split('\n')
    .map(line => line.trim())
    .join('\n');
  // Trim overall
  result = result.trim();
  return result;
}

/**
 * Main clean text function.
 * Strips HTML, RTF, entities, invisible chars, normalizes whitespace.
 */
export function cleanText(input: string): string {
  if (!input) return '';

  let result = input;
  result = stripHtmlTags(result);
  result = decodeHtmlEntities(result);
  result = stripRtfCodes(result);
  result = removeInvisibleChars(result);
  result = normalizeWhitespace(result);

  return result;
}
