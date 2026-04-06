/** zxcvbn recommends bounding input length for very long passwords. */
export const ZXCVBN_MAX_LEN = 100;

export function sliceForZxcvbn(plain: string): string {
  return plain.length > ZXCVBN_MAX_LEN ? plain.slice(0, ZXCVBN_MAX_LEN) : plain;
}
