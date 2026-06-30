import assert from 'node:assert/strict';
import {
  createMinorAuthorizationToken,
  normalizeDni,
  verifyMinorAuthorizationToken,
} from '../src/lib/minorAuthorization.ts';

const secret = 'test-secret';
const payload = {
  requesterName: 'Roberto',
  requesterEmail: 'roberto@example.com',
  eventName: 'Concierto demo',
  eventDate: '2026-06-30',
  minorName: 'Juan',
  minorBirthDate: '2014-06-19',
  parentName: 'Roberto',
  parentDni: '26241234l',
  parentPhone: '600000000',
};

assert.equal(normalizeDni(' 26241234l '), '26241234L');

const token = await createMinorAuthorizationToken(payload, secret);
const verified = await verifyMinorAuthorizationToken(token, secret);
assert.equal(verified.payload.parentDni, '26241234L');

let rejected = false;
try {
  await verifyMinorAuthorizationToken(`${token}x`, secret);
} catch {
  rejected = true;
}
assert.equal(rejected, true);

console.log('minor-authorization self-check ok');
