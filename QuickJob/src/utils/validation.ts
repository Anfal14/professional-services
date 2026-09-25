import type { BookingInput } from '@/types';

export type BookingErrors = Partial<Record<keyof BookingInput, string>>;

/** Strip spaces, dashes and a leading +91 / 0 to get the 10-digit Indian mobile number. */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export function isValidPhone(raw: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizePhone(raw));
}

export function validateBooking(input: Partial<BookingInput>): BookingErrors {
  const errors: BookingErrors = {};
  const name = input.name?.trim() ?? '';
  const address = input.address?.trim() ?? '';

  if (name.length < 2) errors.name = 'Please enter your full name';
  else if (!/^[\p{L} .'-]+$/u.test(name)) errors.name = 'Name can only contain letters';

  if (address.length < 10) errors.address = 'Please enter your complete address (house no., street, area)';

  if (!input.phone?.trim()) errors.phone = 'Contact number is required';
  else if (!isValidPhone(input.phone)) errors.phone = 'Enter a valid 10-digit mobile number';

  if (!input.issueId) errors.issueId = 'Please select the problem you are facing';
  if (!input.date) errors.date = 'Please pick a preferred date';
  if (!input.time) errors.time = 'Please pick a preferred time slot';

  return errors;
}
