import type { Booking, PriceBreakdown, ProblemType, ServiceCategory, PlatformSettings } from './types';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The single place money is calculated.
 * - Customer pays serviceAmount + tax (GST on the service).
 * - Platform keeps `commissionRate` of serviceAmount.
 * - Vendor earns serviceAmount − commission. Tax is remitted by the platform.
 * Tax and commission are rounded to whole rupees so customers never see paise.
 */
export function computeBreakdown(serviceAmount: number, commissionRate: number, taxRate: number): PriceBreakdown {
  const amount = Math.max(0, round2(serviceAmount));
  const tax = Math.round(amount * taxRate);
  const commission = Math.round(amount * commissionRate);
  return {
    serviceAmount: amount,
    tax,
    total: round2(amount + tax),
    commissionRate,
    commission,
    vendorPayout: round2(amount - commission),
  };
}

export function breakdownFor(
  problem: ProblemType,
  category: ServiceCategory,
  settings: PlatformSettings,
): PriceBreakdown {
  const rate = category.commissionRate ?? settings.defaultCommissionRate;
  return computeBreakdown(problem.price, rate, settings.taxRate);
}

export const PRICING_MODEL_LABEL: Record<ProblemType['pricingModel'], string> = {
  fixed: 'Fixed price',
  starting_at: 'Starting at',
  inspection: 'Inspection visit',
};

/**
 * Vendor wallet, derived from bookings and payouts.
 * - Online-paid jobs: platform holds the money and owes the vendor `vendorPayout`.
 * - Cash jobs: vendor already holds the money and owes the platform `commission`.
 * Balance = online payouts owed − cash commission owed − amounts already paid out.
 */
export interface VendorWallet {
  grossEarnings: number;
  commissionDeducted: number;
  netEarnings: number;
  onlinePayoutOwed: number;
  cashCommissionOwed: number;
  settled: number;
  inProcess: number;
  /** What the platform still owes the vendor (can be negative if the vendor owes cash commission). */
  balance: number;
  completedJobs: number;
}

export function computeVendorWallet(
  vendorId: string,
  bookings: Booking[],
  payouts: { vendorId: string; amount: number; status: string }[],
): VendorWallet {
  let gross = 0;
  let commission = 0;
  let online = 0;
  let cashCommission = 0;
  let completed = 0;
  for (const b of bookings) {
    if (b.vendorId !== vendorId || b.status !== 'completed') continue;
    completed += 1;
    gross += b.price.serviceAmount;
    commission += b.price.commission;
    if (b.payment.status !== 'paid') continue;
    if (b.payment.method === 'cash') cashCommission += b.price.commission;
    else online += b.price.vendorPayout;
  }
  const mine = payouts.filter((p) => p.vendorId === vendorId);
  const settled = mine.filter((p) => p.status === 'settled').reduce((s, p) => s + p.amount, 0);
  const inProcess = mine.filter((p) => p.status === 'pending' || p.status === 'processing').reduce((s, p) => s + p.amount, 0);
  return {
    grossEarnings: round2(gross),
    commissionDeducted: round2(commission),
    netEarnings: round2(gross - commission),
    onlinePayoutOwed: round2(online),
    cashCommissionOwed: round2(cashCommission),
    settled: round2(settled),
    inProcess: round2(inProcess),
    balance: round2(online - cashCommission - settled - inProcess),
    completedJobs: completed,
  };
}
