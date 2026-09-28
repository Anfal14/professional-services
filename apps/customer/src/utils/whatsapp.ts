import { Linking } from 'react-native';
import { bookingAckText, whatsappLink, type Booking, type Database } from '@profecian/shared';
import { APP_CONFIG } from '@/config';

/** Acknowledgement message shown on the success screen and pre-filled in WhatsApp. */
export function buildAcknowledgement(db: Database, booking: Booking): string {
  return bookingAckText(db, booking);
}

export function whatsappUrl(text: string, phone: string = APP_CONFIG.whatsappNumber): string {
  return whatsappLink(phone, text);
}

export async function openWhatsApp(text: string, phone?: string): Promise<boolean> {
  try {
    await Linking.openURL(whatsappUrl(text, phone));
    return true;
  } catch {
    return false;
  }
}
