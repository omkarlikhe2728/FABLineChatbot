const validators = require('../../src/utils/validators');

describe('Validators', () => {
  test('isValidPhone - valid international format', () => {
    expect(validators.isValidPhone('+919876543210')).toBe(true);
  });

  test('isValidPhone - invalid format without +', () => {
    expect(validators.isValidPhone('919876543210')).toBe(false);
  });

  test('isValidPhone - invalid short number', () => {
    expect(validators.isValidPhone('+91123')).toBe(false);
  });

  test('isValidOTP - valid 6 digits', () => {
    expect(validators.isValidOTP('123456')).toBe(true);
  });

  test('isValidOTP - invalid 5 digits', () => {
    expect(validators.isValidOTP('12345')).toBe(false);
  });

  test('isValidOTP - invalid 7 digits', () => {
    expect(validators.isValidOTP('1234567')).toBe(false);
  });

  test('isValidOTP - non-numeric', () => {
    expect(validators.isValidOTP('12345a')).toBe(false);
  });

  test('formatPhoneInput - adds country code', () => {
    const result = validators.formatPhoneInput('9876543210');
    expect(result).toBe('+919876543210');
  });

  test('formatPhoneInput - keeps + prefix', () => {
    const result = validators.formatPhoneInput('+919876543210');
    expect(result).toBe('+919876543210');
  });

  test('formatPhoneInput - removes leading 0', () => {
    const result = validators.formatPhoneInput('09876543210');
    expect(result).toBe('+919876543210');
  });

  test('formatPhoneInput - removes spaces and special chars', () => {
    const result = validators.formatPhoneInput('+91 98765-43210');
    expect(result).toBe('+919876543210');
  });

  test('sanitizeInput - removes script tags', () => {
    const result = validators.sanitizeInput('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
  });

  test('sanitizeInput - removes quotes', () => {
    const result = validators.sanitizeInput('test"value\'more');
    expect(result).toBe('testvaluemore');
  });

  test('sanitizeInput - trims whitespace', () => {
    const result = validators.sanitizeInput('  test input  ');
    expect(result).toBe('test input');
  });
});
