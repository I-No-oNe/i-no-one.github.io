/// <reference types="astro/client" />

declare class QRCode {
  constructor(element: HTMLElement, options: { text: string; width: number; height: number });
}

interface Window {
  html2pdf: any;
  jspdf: any;
  mammoth: any;
  PDFLib: any;
  pdfjsLib: any;
  Tesseract: any;
}
