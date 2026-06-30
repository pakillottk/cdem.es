import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export interface MinorAuthorizationPdfInput {
  requesterName: string;
  eventName: string;
  eventDate?: string;
  minorName: string;
  minorBirthDate: string;
  minorDni?: string;
  parentName: string;
  parentDni: string;
  parentPhone: string;
  parentAddress?: string;
  companionName?: string;
  companionDni?: string;
  companionPhone?: string;
  locality: string;
  signedAt: string;
  signaturePng: Uint8Array;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function formatDate(date: string | undefined): string {
  if (!date) return '';
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

export function signatureDataUrlToPngBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  if (!base64) throw new Error('La firma no es válida.');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

function drawLines(
  page: PDFPage,
  lines: string[],
  x: number,
  y: number,
  font: PDFFont,
  fontSize: number,
  lineHeight: number,
  color = rgb(0.07, 0.07, 0.07),
): number {
  let cursorY = y;
  for (const line of lines) {
    page.drawText(line, { x, y: cursorY, size: fontSize, font, color });
    cursorY -= lineHeight;
  }
  return cursorY;
}

function drawSectionTitle(page: PDFPage, title: string, x: number, y: number, font: PDFFont): number {
  page.drawText(title, { x, y, size: 13, font, color: rgb(0.07, 0.07, 0.07) });
  page.drawLine({
    start: { x, y: y - 6 },
    end: { x: x + CONTENT_WIDTH, y: y - 6 },
    thickness: 0.75,
    color: rgb(0.82, 0.82, 0.82),
  });
  return y - 24;
}

function drawField(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  regular: PDFFont,
  bold: PDFFont,
): number {
  const labelText = `${label}: `;
  const labelWidth = bold.widthOfTextAtSize(labelText, 11);
  page.drawText(labelText, { x, y, size: 11, font: bold, color: rgb(0.07, 0.07, 0.07) });
  const valueLines = wrapText(value, regular, 11, CONTENT_WIDTH - labelWidth);
  let cursorY = y;
  for (let index = 0; index < valueLines.length; index += 1) {
    page.drawText(valueLines[index], {
      x: index === 0 ? x + labelWidth : x,
      y: cursorY,
      size: 11,
      font: regular,
      color: rgb(0.07, 0.07, 0.07),
    });
    cursorY -= 16;
  }
  return cursorY - 4;
}

export async function buildMinorAuthorizationPdf(
  input: MinorAuthorizationPdfInput,
  logoPng: Uint8Array,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const logo = await pdf.embedPng(logoPng);
  const logoScale = Math.min(180 / logo.width, 56 / logo.height);
  const logoWidth = logo.width * logoScale;
  const logoHeight = logo.height * logoScale;
  page.drawImage(logo, {
    x: MARGIN,
    y: PAGE_HEIGHT - MARGIN - logoHeight,
    width: logoWidth,
    height: logoHeight,
  });

  page.drawText('Autorización de menores', {
    x: MARGIN,
    y: PAGE_HEIGHT - MARGIN - logoHeight - 28,
    size: 22,
    font: bold,
    color: rgb(0.07, 0.07, 0.07),
  });

  page.drawText(`Solicitante: ${input.requesterName}`, {
    x: MARGIN,
    y: PAGE_HEIGHT - MARGIN - logoHeight - 48,
    size: 10,
    font: regular,
    color: rgb(0.42, 0.45, 0.5),
  });

  const eventDate = formatDate(input.eventDate);
  const intro = eventDate
    ? `Autorizo al menor indicado a acceder al evento ${input.eventName} el ${eventDate} y acepto la responsabilidad derivada de su asistencia.`
    : `Autorizo al menor indicado a acceder al evento ${input.eventName} y acepto la responsabilidad derivada de su asistencia.`;

  let y = PAGE_HEIGHT - MARGIN - logoHeight - 78;
  y = drawLines(page, wrapText(intro, regular, 12, CONTENT_WIDTH), MARGIN, y, regular, 12, 18) - 10;

  y = drawSectionTitle(page, '1) Datos del menor', MARGIN, y, bold);
  y = drawField(page, 'Nombre y apellidos', input.minorName, MARGIN, y, regular, bold);
  y = drawField(page, 'Fecha de nacimiento', formatDate(input.minorBirthDate), MARGIN, y, regular, bold);
  y = drawField(page, 'DNI', input.minorDni?.trim() || '-', MARGIN, y, regular, bold);

  y = drawSectionTitle(page, '2) Padre, madre o tutor legal', MARGIN, y - 8, bold);
  y = drawField(page, 'Nombre y apellidos', input.parentName, MARGIN, y, regular, bold);
  y = drawField(page, 'DNI', input.parentDni, MARGIN, y, regular, bold);
  y = drawField(page, 'Teléfono', input.parentPhone, MARGIN, y, regular, bold);
  y = drawField(page, 'Domicilio', input.parentAddress?.trim() || '-', MARGIN, y, regular, bold);

  y = drawSectionTitle(page, '3) Adulto acompañante o custodio alternativo', MARGIN, y - 8, bold);
  y = drawField(page, 'Nombre y apellidos', input.companionName?.trim() || '-', MARGIN, y, regular, bold);
  y = drawField(page, 'DNI', input.companionDni?.trim() || '-', MARGIN, y, regular, bold);
  y = drawField(page, 'Teléfono', input.companionPhone?.trim() || '-', MARGIN, y, regular, bold);

  const signature = await pdf.embedPng(input.signaturePng);
  const signatureScale = Math.min(180 / signature.width, 70 / signature.height);
  const signatureWidth = signature.width * signatureScale;
  const signatureHeight = signature.height * signatureScale;
  const footerY = 120;

  page.drawLine({
    start: { x: MARGIN, y: footerY + 88 },
    end: { x: MARGIN + CONTENT_WIDTH, y: footerY + 88 },
    thickness: 0.75,
    color: rgb(0.82, 0.82, 0.82),
  });

  page.drawText(`En ${input.locality}`, {
    x: MARGIN,
    y: footerY + 58,
    size: 11,
    font: regular,
    color: rgb(0.07, 0.07, 0.07),
  });
  page.drawText(`Fecha de firma: ${input.signedAt}`, {
    x: MARGIN,
    y: footerY + 40,
    size: 11,
    font: regular,
    color: rgb(0.07, 0.07, 0.07),
  });

  page.drawText('Firma', {
    x: PAGE_WIDTH - MARGIN - signatureWidth,
    y: footerY + signatureHeight + 12,
    size: 10,
    font: regular,
    color: rgb(0.42, 0.45, 0.5),
  });
  page.drawImage(signature, {
    x: PAGE_WIDTH - MARGIN - signatureWidth,
    y: footerY,
    width: signatureWidth,
    height: signatureHeight,
  });
  page.drawLine({
    start: { x: PAGE_WIDTH - MARGIN - signatureWidth, y: footerY - 4 },
    end: { x: PAGE_WIDTH - MARGIN, y: footerY - 4 },
    thickness: 0.75,
    color: rgb(0.07, 0.07, 0.07),
  });

  return pdf.save();
}

export function pdfBytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function fetchPdfAsset(origin: string, path: string): Promise<Uint8Array> {
  const response = await fetch(new URL(path, origin));
  if (!response.ok) {
    throw new Error(`No se pudo cargar el recurso PDF: ${path}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}
