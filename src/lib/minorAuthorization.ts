export interface MinorRecord {
  name: string;
  birthDate: string;
  dni?: string;
}

export interface MinorAuthorizationPayload {
  requesterName: string;
  requesterEmail: string;
  eventName: string;
  eventDate?: string;
  entryCode?: string;
  minorCount?: number;
  minors?: MinorRecord[];
  /** Primer menor; conservado para tokens antiguos y compatibilidad. */
  minorName: string;
  minorBirthDate: string;
  minorDni?: string;
  parentName: string;
  parentDni: string;
  parentPhone: string;
  hasSecondTutor?: boolean;
  secondParentName?: string;
  secondParentDni?: string;
  secondParentPhone?: string;
  companionName?: string;
  companionDni?: string;
  companionPhone?: string;
}

interface SignedTokenEnvelope {
  payload: MinorAuthorizationPayload;
  issuedAt: number;
  expiresAt: number;
}

export const SIGNATURE_TOKEN_TTL_MINUTES = 15;
const TOKEN_TTL_MS = SIGNATURE_TOKEN_TTL_MINUTES * 60 * 1000;

function toBase64Url(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function sign(input: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input));
  return toBase64Url(new Uint8Array(signature));
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export function normalizeDni(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

export function normalizeMinorRecords(minors: MinorRecord[]): MinorRecord[] {
  return minors.map((minor) => ({
    name: minor.name.trim(),
    birthDate: minor.birthDate,
    dni: minor.dni?.trim() || undefined,
  }));
}

export interface MinorAuthorizationRequestFields {
  minorCount: string;
  minorName: string;
  minorBirthDate: string;
  minorDni?: string;
  minor2Name?: string;
  minor2BirthDate?: string;
  minor2Dni?: string;
  minor3Name?: string;
  minor3BirthDate?: string;
  minor3Dni?: string;
  hasSecondTutor: string;
  secondParentName?: string;
  secondParentDni?: string;
  secondParentPhone?: string;
}

export function buildMinorsFromRequest(input: MinorAuthorizationRequestFields): MinorRecord[] {
  const count = Number(input.minorCount);
  const minors: MinorRecord[] = [
    {
      name: input.minorName,
      birthDate: input.minorBirthDate,
      dni: input.minorDni,
    },
  ];
  if (count >= 2) {
    minors.push({
      name: input.minor2Name ?? '',
      birthDate: input.minor2BirthDate ?? '',
      dni: input.minor2Dni,
    });
  }
  if (count >= 3) {
    minors.push({
      name: input.minor3Name ?? '',
      birthDate: input.minor3BirthDate ?? '',
      dni: input.minor3Dni,
    });
  }
  return normalizeMinorRecords(minors);
}

export function getMinorsFromPayload(payload: MinorAuthorizationPayload): MinorRecord[] {
  if (payload.minors?.length) return payload.minors;
  return normalizeMinorRecords([
    {
      name: payload.minorName,
      birthDate: payload.minorBirthDate,
      dni: payload.minorDni,
    },
  ]);
}

export async function createMinorAuthorizationToken(
  payload: MinorAuthorizationPayload,
  secret: string,
): Promise<string> {
  const now = Date.now();
  const minors = normalizeMinorRecords(payload.minors);
  const firstMinor = minors[0];
  const envelope: SignedTokenEnvelope = {
    payload: {
      ...payload,
      requesterName: payload.requesterName.trim(),
      requesterEmail: payload.requesterEmail.trim(),
      eventName: payload.eventName.trim(),
      eventDate: payload.eventDate?.trim() || undefined,
      entryCode: payload.entryCode?.trim() || undefined,
      minorCount: payload.minorCount,
      minors,
      minorName: firstMinor.name,
      minorBirthDate: firstMinor.birthDate,
      minorDni: firstMinor.dni,
      parentName: payload.parentName.trim(),
      parentDni: normalizeDni(payload.parentDni),
      parentPhone: payload.parentPhone.trim(),
      hasSecondTutor: payload.hasSecondTutor,
      secondParentName: payload.hasSecondTutor ? payload.secondParentName?.trim() : undefined,
      secondParentDni: payload.hasSecondTutor && payload.secondParentDni
        ? normalizeDni(payload.secondParentDni)
        : undefined,
      secondParentPhone: payload.hasSecondTutor ? payload.secondParentPhone?.trim() : undefined,
      companionName: payload.companionName?.trim() || undefined,
      companionDni: payload.companionDni ? normalizeDni(payload.companionDni) : undefined,
      companionPhone: payload.companionPhone?.trim() || undefined,
    },
    issuedAt: now,
    expiresAt: now + TOKEN_TTL_MS,
  };
  const body = toBase64Url(JSON.stringify(envelope));
  const signature = await sign(body, secret);
  return `${body}.${signature}`;
}

export async function verifyMinorAuthorizationToken(
  token: string,
  secret: string,
): Promise<SignedTokenEnvelope> {
  const [body, signature] = token.split('.');
  if (!body || !signature) {
    throw new Error('Token inválido.');
  }

  const expectedSignature = await sign(body, secret);
  if (!timingSafeEqual(signature, expectedSignature)) {
    throw new Error('La firma del enlace no es válida.');
  }

  const json = new TextDecoder().decode(fromBase64Url(body));
  const envelope = JSON.parse(json) as SignedTokenEnvelope;
  if (Date.now() > envelope.expiresAt) {
    throw new Error(`El enlace ha caducado (válido ${SIGNATURE_TOKEN_TTL_MINUTES} minutos).`);
  }
  return envelope;
}
