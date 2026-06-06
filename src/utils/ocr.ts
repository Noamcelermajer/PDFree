import { OCRClient } from 'tesseract-wasm';

let ocrClient: OCRClient | null = null;

export async function getOCRClient(): Promise<OCRClient> {
  if (!ocrClient) {
    ocrClient = new OCRClient({ workerPath: '/tesseract-worker.js' });
    await ocrClient.loadModel('/eng.traineddata');
  }
  return ocrClient;
}

export async function runOCR(imageBitmap: ImageBitmap): Promise<string> {
  const ocr = await getOCRClient();
  await ocr.loadImage(imageBitmap);
  const text = await ocr.getText();
  return text;
}

export function terminateOCR() {
  if (ocrClient) {
    ocrClient.destroy();
    ocrClient = null;
  }
}
