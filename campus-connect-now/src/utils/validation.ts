const ACADEMIC_EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(edu|edu\.[a-z]{2,}|ac\.[a-z]{2,})$/i;

export function isValidAcademicEmail(email: string): boolean {
  return ACADEMIC_EMAIL_REGEX.test(email.trim());
}

export function getEmailDomain(email: string): string {
  return email.trim().split('@')[1]?.toLowerCase() ?? '';
}
