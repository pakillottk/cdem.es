import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import type { MinorRecord } from './minorAuthorization';

export interface MinorAuthorizationPdfInput {
  requesterName: string;
  eventName: string;
  eventDate?: string;
  entryCode?: string;
  minorCount: number;
  minors: MinorRecord[];
  minorName: string;
  minorBirthDate: string;
  minorDni?: string;
  parentName: string;
  parentDni: string;
  parentPhone?: string;
  hasSecondTutor: boolean;
  secondParentName?: string;
  secondParentDni?: string;
  secondParentPhone?: string;
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
const MIN_CONTENT_Y = 200;

const LEGAL_CLAUSES = [
  'El firmante declara que los datos facilitados son veraces y que ostenta la patria potestad, tutela o guarda legal sobre el/los menor(es) autorizado(s).',
  'El firmante asume la responsabilidad por la asistencia del/de los menor(es) al evento y por el cumplimiento de las normas de acceso y conducta del recinto.',
  'Creación y Diseño de Eventos Musicales S.L. tratará los datos personales con la finalidad de gestionar esta autorización, conforme a su Política de Privacidad (cdem.es/politica-de-privacidad). La base legitimadora es el consentimiento del interesado y, en su caso, el cumplimiento de obligaciones legales.',
  'Los datos se conservarán durante el tiempo necesario para la gestión de la autorización y el plazo legalmente exigible. El interesado puede ejercer sus derechos de acceso, rectificación, supresión, limitación, oposición y portabilidad en cdemcontratacion@gmail.com, así como reclamar ante la AEPD (www.aepd.es).',
  'Este documento constituye la manifestación expresa de consentimiento del tutor o tutores firmantes para la asistencia del/de los menor(es) al evento indicado.',
];

function isFilled(value?: string): boolean {
  return Boolean(value?.trim());
}

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

function drawFieldIfFilled(
  page: PDFPage,
  label: string,
  value: string | undefined,
  x: number,
  y: number,
  regular: PDFFont,
  bold: PDFFont,
): number {
  if (!isFilled(value)) return y;
  return drawField(page, label, value!.trim(), x, y, regular, bold);
}

type PdfContext = {
  pdf: PDFDocument;
  page: PDFPage;
  regular: PDFFont;
  bold: PDFFont;
  y: number;
};

function ensureSpace(ctx: PdfContext, needed: number): void {
  if (ctx.y - needed >= MIN_CONTENT_Y) return;
  ctx.page = ctx.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.y = PAGE_HEIGHT - MARGIN;
}

function drawLegalClauses(ctx: PdfContext): void {
  const fontSize = 7.5;
  const lineHeight = 10;
  const clauseGap = 6;
  const totalLines = LEGAL_CLAUSES.reduce(
    (count, clause) => count + wrapText(clause, ctx.regular, fontSize, CONTENT_WIDTH).length,
    0,
  );
  const totalHeight = totalLines * lineHeight + (LEGAL_CLAUSES.length - 1) * clauseGap + 16;
  ensureSpace(ctx, totalHeight);

  ctx.y = drawSectionTitle(ctx.page, 'Información legal', MARGIN, ctx.y - 8, ctx.bold);
  for (const clause of LEGAL_CLAUSES) {
    const lines = wrapText(clause, ctx.regular, fontSize, CONTENT_WIDTH);
    ctx.y = drawLines(
      ctx.page,
      lines,
      MARGIN,
      ctx.y,
      ctx.regular,
      fontSize,
      lineHeight,
      rgb(0.35, 0.38, 0.42),
    ) - clauseGap;
  }
}

function drawSignatureBlock(
  ctx: PdfContext,
  input: MinorAuthorizationPdfInput,
  signatureWidth: number,
  signatureHeight: number,
  signature: PDFImage,
): void {
  ensureSpace(ctx, signatureHeight + 100);

  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: MARGIN + CONTENT_WIDTH, y: ctx.y },
    thickness: 0.75,
    color: rgb(0.82, 0.82, 0.82),
  });
  ctx.y -= 24;

  ctx.page.drawText(`En ${input.locality}`, {
    x: MARGIN,
    y: ctx.y,
    size: 11,
    font: ctx.regular,
    color: rgb(0.07, 0.07, 0.07),
  });
  ctx.page.drawText(`Fecha de firma: ${input.signedAt}`, {
    x: MARGIN,
    y: ctx.y - 18,
    size: 11,
    font: ctx.regular,
    color: rgb(0.07, 0.07, 0.07),
  });

  const signatureY = ctx.y - signatureHeight - 8;
  ctx.page.drawText('Firma', {
    x: PAGE_WIDTH - MARGIN - signatureWidth,
    y: signatureY + signatureHeight + 12,
    size: 10,
    font: ctx.regular,
    color: rgb(0.42, 0.45, 0.5),
  });
  ctx.page.drawImage(signature, {
    x: PAGE_WIDTH - MARGIN - signatureWidth,
    y: signatureY,
    width: signatureWidth,
    height: signatureHeight,
  });
  ctx.page.drawLine({
    start: { x: PAGE_WIDTH - MARGIN - signatureWidth, y: signatureY - 4 },
    end: { x: PAGE_WIDTH - MARGIN, y: signatureY - 4 },
    thickness: 0.75,
    color: rgb(0.07, 0.07, 0.07),
  });
  ctx.y = signatureY - 20;
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
  const minorLabel = input.minorCount > 1 ? 'los menores indicados' : 'el menor indicado';
  const intro = eventDate
    ? `Autorizo a ${minorLabel} a acceder al evento ${input.eventName} el ${eventDate} y acepto la responsabilidad derivada de su asistencia.`
    : `Autorizo a ${minorLabel} a acceder al evento ${input.eventName} y acepto la responsabilidad derivada de su asistencia.`;

  const ctx: PdfContext = { pdf, page, regular, bold, y: PAGE_HEIGHT - MARGIN - logoHeight - 78 };
  ctx.y = drawLines(page, wrapText(intro, regular, 12, CONTENT_WIDTH), MARGIN, ctx.y, regular, 12, 18) - 10;
  ctx.y = drawFieldIfFilled(page, 'Código de la entrada', input.entryCode, MARGIN, ctx.y, regular, bold);

  let sectionNum = 1;
  ctx.y = drawSectionTitle(page, `${sectionNum}) Datos del menor`, MARGIN, ctx.y, bold);
  sectionNum += 1;
  for (const [index, minor] of input.minors.entries()) {
    if (input.minors.length > 1) {
      page.drawText(`Menor ${index + 1}`, {
        x: MARGIN,
        y: ctx.y,
        size: 11,
        font: bold,
        color: rgb(0.42, 0.45, 0.5),
      });
      ctx.y -= 18;
    }
    ctx.y = drawField(page, 'Nombre y apellidos', minor.name, MARGIN, ctx.y, regular, bold);
    ctx.y = drawField(page, 'Fecha de nacimiento', formatDate(minor.birthDate), MARGIN, ctx.y, regular, bold);
    ctx.y = drawFieldIfFilled(page, 'DNI', minor.dni, MARGIN, ctx.y, regular, bold);
  }

  ctx.y = drawSectionTitle(page, `${sectionNum}) Padre, madre o tutor legal`, MARGIN, ctx.y - 8, bold);
  sectionNum += 1;
  ctx.y = drawField(page, 'Nombre y apellidos', input.parentName, MARGIN, ctx.y, regular, bold);
  ctx.y = drawField(page, 'DNI', input.parentDni, MARGIN, ctx.y, regular, bold);
  ctx.y = drawFieldIfFilled(page, 'Teléfono', input.parentPhone, MARGIN, ctx.y, regular, bold);

  const hasSecondTutorData = input.hasSecondTutor && (
    isFilled(input.secondParentName) || isFilled(input.secondParentDni) || isFilled(input.secondParentPhone)
  );
  if (hasSecondTutorData) {
    ctx.y = drawSectionTitle(page, `${sectionNum}) Segundo tutor que autoriza`, MARGIN, ctx.y - 8, bold);
    sectionNum += 1;
    ctx.y = drawFieldIfFilled(page, 'Nombre y apellidos', input.secondParentName, MARGIN, ctx.y, regular, bold);
    ctx.y = drawFieldIfFilled(page, 'DNI', input.secondParentDni, MARGIN, ctx.y, regular, bold);
    ctx.y = drawFieldIfFilled(page, 'Teléfono', input.secondParentPhone, MARGIN, ctx.y, regular, bold);
  }

  const hasCompanionData = isFilled(input.companionName)
    || isFilled(input.companionDni)
    || isFilled(input.companionPhone);
  if (hasCompanionData) {
    ctx.y = drawSectionTitle(
      page,
      `${sectionNum}) Adulto acompañante o custodio alternativo`,
      MARGIN,
      ctx.y - 8,
      bold,
    );
    ctx.y = drawFieldIfFilled(page, 'Nombre y apellidos', input.companionName, MARGIN, ctx.y, regular, bold);
    ctx.y = drawFieldIfFilled(page, 'DNI', input.companionDni, MARGIN, ctx.y, regular, bold);
    ctx.y = drawFieldIfFilled(page, 'Teléfono', input.companionPhone, MARGIN, ctx.y, regular, bold);
  }

  const signature = await pdf.embedPng(input.signaturePng);
  const signatureScale = Math.min(180 / signature.width, 70 / signature.height);
  const signatureWidth = signature.width * signatureScale;
  const signatureHeight = signature.height * signatureScale;

  drawSignatureBlock(ctx, input, signatureWidth, signatureHeight, signature);
  drawLegalClauses(ctx);

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
