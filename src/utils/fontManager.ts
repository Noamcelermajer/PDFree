import { PDFDocument, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const FONT_BASE = '/PDFree/fonts';

interface FontMapping {
  url: string;
  name: string;
}

// Unicode block detection for font selection
const UNICODE_RANGES: { test: (char: string) => boolean; font: FontMapping }[] = [
  {
    // Hebrew
    test: (c) => /[\u0590-\u05FF]/.test(c),
    font: { url: `${FONT_BASE}/NotoSansHebrew-Regular.ttf`, name: 'NotoSansHebrew' },
  },
  {
    // Arabic + Persian + Urdu
    test: (c) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(c),
    font: { url: `${FONT_BASE}/NotoSansArabic-Regular.ttf`, name: 'NotoSansArabic' },
  },
  {
    // CJK (Chinese, Japanese, Korean) — note: we don't bundle CJK fonts due to size
    // This will fall through to the default NotoSans which has basic CJK support
    test: (c) => /[\u4E00-\u9FFF\u3400-\u4DBF\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/.test(c),
    font: { url: `${FONT_BASE}/NotoSans-Regular.ttf`, name: 'NotoSans' },
  },
  {
    // Cyrillic
    test: (c) => /[\u0400-\u04FF]/.test(c),
    font: { url: `${FONT_BASE}/NotoSans-Regular.ttf`, name: 'NotoSans' },
  },
  {
    // Greek
    test: (c) => /[\u0370-\u03FF]/.test(c),
    font: { url: `${FONT_BASE}/NotoSans-Regular.ttf`, name: 'NotoSans' },
  },
  {
    // Latin and everything else — default
    test: () => true,
    font: { url: `${FONT_BASE}/NotoSans-Regular.ttf`, name: 'NotoSans' },
  },
];

// In-memory cache: url -> ArrayBuffer
const fontCache = new Map<string, ArrayBuffer>();
// Per-document font cache: PDFDocument -> (url -> PDFFont)
const pdfFontCache = new WeakMap<PDFDocument, Map<string, PDFFont>>();

function detectFontForText(text: string): FontMapping {
  for (const range of UNICODE_RANGES) {
    if (text.split('').some(range.test)) {
      return range.font;
    }
  }
  return UNICODE_RANGES[UNICODE_RANGES.length - 1].font;
}

async function fetchFontBuffer(url: string): Promise<ArrayBuffer> {
  if (fontCache.has(url)) {
    return fontCache.get(url)!;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch font from ${url}: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  fontCache.set(url, buffer);
  return buffer;
}

/**
 * Gets (or creates) a PDFFont instance suitable for rendering the given text.
 * Registers fontkit on the document if needed.
 */
export async function getFontForText(pdfDoc: PDFDocument, text: string): Promise<PDFFont> {
  // Register fontkit (safe to call multiple times)
  pdfDoc.registerFontkit(fontkit);

  const mapping = detectFontForText(text);

  // Check if we already embedded this font into this document
  let docCache = pdfFontCache.get(pdfDoc);
  if (!docCache) {
    docCache = new Map();
    pdfFontCache.set(pdfDoc, docCache);
  }
  if (docCache.has(mapping.url)) {
    return docCache.get(mapping.url)!;
  }

  const fontBytes = await fetchFontBuffer(mapping.url);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });
  docCache.set(mapping.url, font);
  return font;
}

/**
 * Clears the global font byte cache. Call sparingly — the WeakMap for
 * per-document fonts auto-cleans when the PDFDocument is garbage-collected.
 */
export function clearPdfFontCache() {
  fontCache.clear();
}
