const ACADEMIC_EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(edu|edu\.[a-z]{2,}|ac\.[a-z]{2,})$/i;

export function isValidAcademicEmail(email: string): boolean {
  return ACADEMIC_EMAIL_REGEX.test(email.trim());
}

export function getEmailDomain(email: string): string {
  return email.trim().split('@')[1]?.toLowerCase() ?? '';
}

export function getValidName(...names: (string | null | undefined)[]): string {
  for (const n of names) {
    if (n && typeof n === 'string' && n.trim() !== '' && n.trim() !== 'Set Name' && n.trim() !== 'User') {
      return n.trim();
    }
  }
  return '';
}
