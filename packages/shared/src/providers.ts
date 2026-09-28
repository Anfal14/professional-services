/**
 * Third-party integrations behind small interfaces. Everything here is a
 * stub/sandbox for now; swap each implementation for the real provider
 * (MSG91/Twilio for OTP, WhatsApp Business API, Razorpay/Cashfree for
 * payments, Expo push) without touching the apps.
 */
import { normalizePhone } from './format';
import type { PaymentMethod } from './types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ───────────── OTP ───────────── */

/** Fixed code accepted by the sandbox OTP provider. Shown as a hint in the apps. */
export const TEST_OTP = '123456';

export interface OtpProvider {
  send(phone: string): Promise<{ requestId: string; resendInSec: number }>;
  verify(requestId: string, code: string): Promise<boolean>;
}

export const sandboxOtp: OtpProvider = {
  async send(phone) {
    await sleep(500);
    return { requestId: `otp_${normalizePhone(phone)}_${Date.now()}`, resendInSec: 30 };
  },
  async verify(_requestId, code) {
    await sleep(400);
    return code.trim() === TEST_OTP;
  },
};

/* ───────────── WhatsApp ───────────── */

export interface WhatsAppProvider {
  /** Returns a deep link for the sandbox; the real provider sends the template server-side. */
  send(toPhone: string, text: string): { url: string };
}

export function whatsappLink(phoneDigits: string, text: string): string {
  const to = phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

export const sandboxWhatsApp: WhatsAppProvider = {
  send(toPhone, text) {
    return { url: whatsappLink(normalizePhone(toPhone), text) };
  },
};

/* ───────────── Payments ───────────── */

export interface PaymentRequest {
  amount: number;
  method: Exclude<PaymentMethod, 'cash'>;
  bookingCode: string;
  /** Sandbox only: force a failure to exercise the failed-payment flow. */
  simulateFailure?: boolean;
}

export type PaymentResult = { ok: true; txnId: string } | { ok: false; reason: string };

export interface PaymentGateway {
  charge(req: PaymentRequest): Promise<PaymentResult>;
}

export const sandboxPayments: PaymentGateway = {
  async charge(req) {
    await sleep(1200);
    if (req.simulateFailure) return { ok: false, reason: 'Payment declined by bank (sandbox)' };
    return { ok: true, txnId: `pay_${req.bookingCode}_${Date.now().toString(36).toUpperCase()}` };
  },
};

export const ONLINE_METHODS: { method: Exclude<PaymentMethod, 'cash'>; label: string; icon: string; hint: string }[] = [
  { method: 'upi', label: 'UPI', icon: 'qr-code-outline', hint: 'GPay, PhonePe, Paytm, BHIM' },
  { method: 'card', label: 'Credit / Debit card', icon: 'card-outline', hint: 'Visa, Mastercard, RuPay' },
  { method: 'netbanking', label: 'Net banking', icon: 'business-outline', hint: 'All major Indian banks' },
  { method: 'wallet', label: 'Wallets', icon: 'wallet-outline', hint: 'Paytm, Amazon Pay, Mobikwik' },
];
