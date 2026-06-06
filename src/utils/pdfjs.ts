import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/PDFree/pdf.worker.mjs';

export { pdfjsLib };
