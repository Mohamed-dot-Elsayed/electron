// src/utils/Qztray.ts
import 'dotenv/config';

const rawCert = process.env.QZ_CERT;
const rawPrivateKey = process.env.QZ_PRIVATE_KEY;

if (!rawCert || !rawPrivateKey) {
  throw new Error('QZ_CERT or QZ_PRIVATE_KEY is not set in environment variables');
}

// لو في .env كاتبين \n كنص، رجّعها newlines حقيقية
export const QZ_CERT = rawCert.replace(/\\n/g, '\n');
export const QZ_PRIVATE_KEY = rawPrivateKey.replace(/\\n/g, '\n');
