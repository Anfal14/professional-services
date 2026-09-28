import { isValidPhone, normalizePhone } from '@profecian/shared';
import type { BookingForm } from '@/types';

export { isValidPhone, normalizePhone };

export type BookingErrors = Partial<Record<keyof BookingForm, string>>;

/** Problem + visit slot are chosen on the service screen and required by both screens. */
export function validateSchedule(input: Partial<Pick<BookingForm, 'issueId' | 'date' | 'time'>>): BookingErrors {
  const errors: BookingErrors = {};
  if (!input.issueId) errors.issueId = 'Please select the problem you are facing';
  if (!input.date) errors.date = 'Please pick a preferred date';
  if (!input.time) errors.time = 'Please pick a preferred time slot';
  return errors;
}

export function validateBooking(input: Partial<BookingForm>): BookingErrors {
  const errors: BookingErrors = {};
  const name = input.name?.trim() ?? '';
  const address = input.address?.trim() ?? '';

  if (name.length < 2) errors.name = 'Please enter your full name';
  else if (!/^[\p{L} .'-]+$/u.test(name)) errors.name = 'Name can only contain letters';

  if (address.length < 10) errors.address = 'Please enter your complete address (house no., street, area)';

  if (!input.phone?.trim()) errors.phone = 'Contact number is required';
  else if (!isValidPhone(input.phone)) errors.phone = 'Enter a valid 10-digit mobile number';

  return { ...errors, ...validateSchedule(input) };
}
