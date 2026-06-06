import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

export async function loadPdf(file: File): Promise<PDFDocument> {
  const arrayBuffer = await file.arrayBuffer();
  return PDFDocument.load(arrayBuffer);
}

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const pdf = await loadPdf(file);
    const pages = await merged.copyPages(pdf, pdf.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  return merged.save();
}

export async function splitPdf(file: File, pageRanges: string): Promise<Uint8Array> {
  const pdf = await loadPdf(file);
  const newPdf = await PDFDocument.create();
  const pageCount = pdf.getPageCount();
  const indices = parsePageRanges(pageRanges, pageCount);
  const pages = await newPdf.copyPages(pdf, indices);
  pages.forEach((page) => newPdf.addPage(page));
  return newPdf.save();
}

export async function rotatePdf(file: File, degreesVal: number): Promise<Uint8Array> {
  const pdf = await loadPdf(file);
  pdf.getPages().forEach((page) => {
    page.setRotation(degrees(degreesVal));
  });
  return pdf.save();
}

export async function addWatermark(file: File, text: string): Promise<Uint8Array> {
  const pdf = await loadPdf(file);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width / 2 - text.length * 6,
      y: height / 2,
      size: 50,
      color: rgb(0.9, 0.1, 0.1),
      opacity: 0.3,
      font,
    });
  });
  return pdf.save();
}

export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    let image;
    if (file.type === 'image/png') {
      image = await pdf.embedPng(bytes);
    } else {
      image = await pdf.embedJpg(bytes);
    }
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }
  return pdf.save();
}

export function parsePageRanges(input: string, totalPages: number): number[] {
  const indices: number[] = [];
  const parts = input.split(',').map((s) => s.trim());
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map((s) => parseInt(s.trim(), 10));
      for (let i = start; i <= end; i++) {
        if (i >= 1 && i <= totalPages) indices.push(i - 1);
      }
    } else {
      const num = parseInt(part, 10);
      if (num >= 1 && num <= totalPages) indices.push(num - 1);
    }
  }
  return [...new Set(indices)];
}

export function downloadBlob(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.slice()], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
