declare module 'pdfkit' {
  interface PDFDocumentOptions {
    size?: [number, number] | string;
    margins?: {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    };
    autoFirstPage?: boolean;
    bufferPages?:boolean;
  }

  class PDFDocument {
    constructor(options?: PDFDocumentOptions);
    on(event: 'data', callback: (chunk: Buffer) => void): this;
    on(event: 'end', callback: () => void): this;
    on(event: 'error', callback: (err: Error) => void): this;
    addPage(options?: PDFKit.PDFDocumentOptions): PDFDocument;
    end(): void;
    fontSize(size: number): this;
    font(font: string): this;
    text(text: string, x?: number, y?: number, options?: any): this;
    image(src: Buffer | string, x?: number, y?: number, options?: any): this;
    rect(x: number, y: number, w: number, h: number): this;
    stroke(): this;
  }

  export = PDFDocument;
}