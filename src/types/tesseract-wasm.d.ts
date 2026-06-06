declare module 'tesseract-wasm' {
  export class OCRClient {
    constructor(options?: { workerPath?: string });
    loadModel(url: string | ArrayBuffer): Promise<void>;
    loadImage(image: ImageBitmap): Promise<void>;
    getText(): Promise<string>;
    destroy(): void;
  }

  export class OCREngine {
    constructor(wasmBinary: ArrayBuffer);
    loadModel(data: ArrayBuffer): void;
    loadImage(image: ImageBitmap): void;
    getText(): string;
  }
}
