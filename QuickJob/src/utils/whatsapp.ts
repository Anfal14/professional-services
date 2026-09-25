import { Linking } from 'react-native';
import { APP_CONFIG } from '@/config';
import { getIssueTitle, getService } from '@/data/services';
import type { Booking } from '@/types';
import { formatAddress, formatDate, formatPrice } from './format';

/** Acknowledgement message shown on the success screen and pre-filled in WhatsApp. */
export function buildAcknowledgement(booking: Booking): string {
  const service = getService(booking.serviceId);
  const serviceName = service?.name ?? 'Home service';
  const issue = service ? getIssueTitle(service, booking.issueId) : booking.issueId;

  return [
    `Hi ${booking.name.split(' ')[0]}! 👋`,
    `Your QuickJob booking is confirmed ✅`,
    ``,
    `🆔 Booking ID: ${booking.id}`,
    `🛠️ Service: ${serviceName} – ${issue}`,
    `📅 ${formatDate(booking.date)} at ${booking.time}`,
    `📍 ${formatAddress(booking.address, booking.landmark)}`,
    `💰 Starting at ${formatPrice(booking.price)}`,
    ``,
    `Our professional will call you before arriving. Reply to this chat for any help.`,
  ].join('\n');
}

export function whatsappUrl(text: string, phone: string = APP_CONFIG.whatsappNumber): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export async function openWhatsApp(text: string, phone?: string): Promise<boolean> {
  try {
    await Linking.openURL(whatsappUrl(text, phone));
    return true;
  } catch {
    return false;
  }
}
