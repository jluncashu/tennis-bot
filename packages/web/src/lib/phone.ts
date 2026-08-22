// Strips human formatting (spaces, dashes, dots, parens) so the same number
// typed differently doesn't create separate contacts — contacts are matched
// by exact phone string equality on the backend.
export function normalizePhone(input: string): string {
  return input.trim().replace(/[\s\-().]/g, "");
}

const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

export function isValidPhone(input: string): boolean {
  return PHONE_REGEX.test(normalizePhone(input));
}
