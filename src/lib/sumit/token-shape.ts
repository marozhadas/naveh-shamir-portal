/**
 * A SUMIT SingleUseToken looks like a uuid. The server action accepts the same loose, safe charset the client does (letters,
 * digits, hyphens, 8-100 characters) but REFUSES anything that looks like a card number: a string of 12-19 digits, with or without
 * spaces / hyphens. A browser bug that sent the card number in the token field would otherwise pass the charset check.
 * Pure, client-safe.
 */
const TOKEN_CHARSET = /^[A-Za-z0-9-]{8,100}$/;
const LOOKS_LIKE_CARD_NUMBER = /^\d(?:[\d -]*\d)?$/;

export function isPlausibleSumitToken(value: string): boolean {
  if (!TOKEN_CHARSET.test(value)) return false;
  const digitsOnly = value.replace(/[ -]/g, "");
  if (LOOKS_LIKE_CARD_NUMBER.test(value) && digitsOnly.length >= 12 && digitsOnly.length <= 19) return false;
  return true;
}
