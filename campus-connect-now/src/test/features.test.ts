import { describe, it, expect } from 'vitest';
import { isValidAcademicEmail, getEmailDomain } from '@/utils/validation';

describe('Email Validation', () => {
  it('accepts .edu emails', () => {
    expect(isValidAcademicEmail('user@mit.edu')).toBe(true);
  });

  it('accepts .edu.in emails', () => {
    expect(isValidAcademicEmail('user@sru.edu.in')).toBe(true);
  });

  it('accepts .ac.in emails', () => {
    expect(isValidAcademicEmail('user@iitb.ac.in')).toBe(true);
  });

  it('accepts .ac.uk emails', () => {
    expect(isValidAcademicEmail('user@oxford.ac.uk')).toBe(true);
  });

  it('rejects gmail', () => {
    expect(isValidAcademicEmail('user@gmail.com')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidAcademicEmail('')).toBe(false);
  });

  it('extracts domain correctly', () => {
    expect(getEmailDomain('user@sru.edu.in')).toBe('sru.edu.in');
    expect(getEmailDomain('test@mit.edu')).toBe('mit.edu');
  });
});

describe('CSS Caret Safeguard', () => {
  it('contains the global caret-color reset rule', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const cssContent = fs.readFileSync(path.resolve(__dirname, '../index.css'), 'utf-8');
    expect(cssContent).toContain('caret-color: transparent !important');
    expect(cssContent).toContain('*:not(input):not(textarea):not([contenteditable="true"]):not([contenteditable="plaintext-only"])');
  });
});



