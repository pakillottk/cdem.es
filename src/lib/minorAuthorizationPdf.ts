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
  parentPhone: string;
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
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FONT_TITLE = 17;
const FONT_SUBTITLE = 8;
const FONT_INTRO = 9.5;
const FONT_SECTION = 10;
const FONT_BODY = 9;
const FONT_MUTED = 8;
const FONT_LEGAL = 5;
const FIELD_LINE = 11;
const SECTION_GAP = 14;

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
  page.drawText(title, { x, y, size: FONT_SECTION, font, color: rgb(0.07, 0.07, 0.07) });
  page.drawLine({
    start: { x, y: y - 3 },
    end: { x: x + CONTENT_WIDTH, y: y - 3 },
    thickness: 0.5,
    color: rgb(0.82, 0.82, 0.82),
  });
  return y - SECTION_GAP;
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
  const labelWidth = bold.widthOfTextAtSize(labelText, FONT_BODY);
  page.drawText(labelText, { x, y, size: FONT_BODY, font: bold, color: rgb(0.07, 0.07, 0.07) });
  const valueLines = wrapText(value, regular, FONT_BODY, CONTENT_WIDTH - labelWidth);
  let cursorY = y;
  for (let index = 0; index < valueLines.length; index += 1) {
    page.drawText(valueLines[index], {
      x: index === 0 ? x + labelWidth : x,
      y: cursorY,
      size: FONT_BODY,
      font: regular,
      color: rgb(0.07, 0.07, 0.07),
    });
    cursorY -= FIELD_LINE;
  }
  return cursorY - 1;
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
  page: PDFPage;
  regular: PDFFont;
  bold: PDFFont;
  y: number;
};

function drawLegalClauses(ctx: PdfContext): void {
  const lineHeight = 6;
  const clauseGap = 2;
  ctx.y -= 4;
  ctx.page.drawText('Información legal', {
    x: MARGIN,
    y: ctx.y,
    size: FONT_MUTED,
    font: ctx.bold,
    color: rgb(0.42, 0.45, 0.5),
  });
  ctx.y -= 8;
  for (const clause of LEGAL_CLAUSES) {
    const lines = wrapText(clause, ctx.regular, FONT_LEGAL, CONTENT_WIDTH);
    ctx.y = drawLines(
      ctx.page,
      lines,
      MARGIN,
      ctx.y,
      ctx.regular,
      FONT_LEGAL,
      lineHeight,
      rgb(0.4, 0.42, 0.46),
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
  ctx.y -= 6;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: MARGIN + CONTENT_WIDTH, y: ctx.y },
    thickness: 0.5,
    color: rgb(0.82, 0.82, 0.82),
  });
  ctx.y -= 14;

  ctx.page.drawText(`En ${input.locality}`, {
    x: MARGIN,
    y: ctx.y,
    size: FONT_BODY,
    font: ctx.regular,
    color: rgb(0.07, 0.07, 0.07),
  });
  ctx.page.drawText(`Fecha de firma: ${input.signedAt}`, {
    x: MARGIN,
    y: ctx.y - 12,
    size: FONT_BODY,
    font: ctx.regular,
    color: rgb(0.07, 0.07, 0.07),
  });

  const signatureY = ctx.y - signatureHeight - 4;
  ctx.page.drawText('Firma', {
    x: PAGE_WIDTH - MARGIN - signatureWidth,
    y: signatureY + signatureHeight + 8,
    size: FONT_MUTED,
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
    start: { x: PAGE_WIDTH - MARGIN - signatureWidth, y: signatureY - 3 },
    end: { x: PAGE_WIDTH - MARGIN, y: signatureY - 3 },
    thickness: 0.5,
    color: rgb(0.07, 0.07, 0.07),
  });
  ctx.y = signatureY - 8;
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
  const logoScale = Math.min(120 / logo.width, 40 / logo.height);
  const logoWidth = logo.width * logoScale;
  const logoHeight = logo.height * logoScale;
  const headerTop = PAGE_HEIGHT - MARGIN;

  page.drawImage(logo, {
    x: MARGIN,
    y: headerTop - logoHeight,
    width: logoWidth,
    height: logoHeight,
  });

  const titleX = MARGIN + logoWidth + 10;
  page.drawText('Autorización de menores', {
    x: titleX,
    y: headerTop - 18,
    size: FONT_TITLE,
    font: bold,
    color: rgb(0.07, 0.07, 0.07),
  });
  page.drawText(`Solicitante: ${input.requesterName}`, {
    x: titleX,
    y: headerTop - 32,
    size: FONT_SUBTITLE,
    font: regular,
    color: rgb(0.42, 0.45, 0.5),
  });

  const eventDate = formatDate(input.eventDate);
  const minorLabel = input.minorCount > 1 ? 'los menores indicados' : 'el menor indicado';
  const intro = eventDate
    ? `Autorizo a ${minorLabel} a acceder al evento ${input.eventName} el ${eventDate} y acepto la responsabilidad derivada de su asistencia.`
    : `Autorizo a ${minorLabel} a acceder al evento ${input.eventName} y acepto la responsabilidad derivada de su asistencia.`;

  const ctx: PdfContext = {
    page,
    regular,
    bold,
    y: headerTop - logoHeight - 10,
  };
  ctx.y = drawLines(
    page,
    wrapText(intro, regular, FONT_INTRO, CONTENT_WIDTH),
    MARGIN,
    ctx.y,
    regular,
    FONT_INTRO,
    12,
  ) - 4;
  ctx.y = drawFieldIfFilled(page, 'Código de la entrada', input.entryCode, MARGIN, ctx.y, regular, bold);

  let sectionNum = 1;
  ctx.y = drawSectionTitle(page, `${sectionNum}) Datos del menor`, MARGIN, ctx.y - 2, bold);
  sectionNum += 1;
  for (const [index, minor] of input.minors.entries()) {
    if (input.minors.length > 1) {
      page.drawText(`Menor ${index + 1}`, {
        x: MARGIN,
        y: ctx.y,
        size: FONT_BODY,
        font: bold,
        color: rgb(0.42, 0.45, 0.5),
      });
      ctx.y -= 11;
    }
    ctx.y = drawField(page, 'Nombre y apellidos', minor.name, MARGIN, ctx.y, regular, bold);
    ctx.y = drawField(page, 'Fecha de nacimiento', formatDate(minor.birthDate), MARGIN, ctx.y, regular, bold);
    ctx.y = drawFieldIfFilled(page, 'DNI', minor.dni, MARGIN, ctx.y, regular, bold);
  }

  ctx.y = drawSectionTitle(page, `${sectionNum}) Padre, madre o tutor legal`, MARGIN, ctx.y - 2, bold);
  sectionNum += 1;
  ctx.y = drawField(page, 'Nombre y apellidos', input.parentName, MARGIN, ctx.y, regular, bold);
  ctx.y = drawField(page, 'DNI', input.parentDni, MARGIN, ctx.y, regular, bold);
  ctx.y = drawField(page, 'Teléfono', input.parentPhone, MARGIN, ctx.y, regular, bold);

  const hasSecondTutorData = input.hasSecondTutor && (
    isFilled(input.secondParentName) || isFilled(input.secondParentDni) || isFilled(input.secondParentPhone)
  );
  if (hasSecondTutorData) {
    ctx.y = drawSectionTitle(page, `${sectionNum}) Segundo tutor que autoriza`, MARGIN, ctx.y - 2, bold);
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
      ctx.y - 2,
      bold,
    );
    ctx.y = drawFieldIfFilled(page, 'Nombre y apellidos', input.companionName, MARGIN, ctx.y, regular, bold);
    ctx.y = drawFieldIfFilled(page, 'DNI', input.companionDni, MARGIN, ctx.y, regular, bold);
    ctx.y = drawFieldIfFilled(page, 'Teléfono', input.companionPhone, MARGIN, ctx.y, regular, bold);
  }

  const signature = await pdf.embedPng(input.signaturePng);
  const signatureScale = Math.min(140 / signature.width, 48 / signature.height);
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
