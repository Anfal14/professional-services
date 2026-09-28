/**
 * Domain model shared by the customer app, vendor app and admin panel.
 * Shaped like the future backend's API responses so the mock backend in
 * ./mock can be replaced by HTTP calls without touching the UIs.
 */

export type ID = string;
/** ISO-8601 timestamp */
export type Timestamp = string;

export type Role = 'customer' | 'vendor' | 'admin';
export type AdminRole = 'super_admin' | 'operations' | 'finance' | 'support';

/* ───────────── Catalogue (fully admin-managed) ───────────── */

/** How the customer is charged for a problem type. */
export type PricingModel = 'fixed' | 'starting_at' | 'inspection';

export interface ServiceCategory {
  id: ID;
  name: string;
  tagline: string;
  description: string;
  /** Ionicons name, e.g. "snow-outline" */
  icon: string;
  image: string;
  tint: string;
  enabled: boolean;
  popular: boolean;
  /** 0–1, platform commission taken from the service amount */
  commissionRate: number;
  includes: string[];
  sortOrder: number;
}

export interface ProblemType {
  id: ID;
  categoryId: ID;
  name: string;
  description: string;
  icon: string;
  price: number;
  pricingModel: PricingModel;
  durationMins: number;
  enabled: boolean;
}

/* ───────────── People ───────────── */

export interface Address {
  id: ID;
  label: 'Home' | 'Work' | 'Other';
  line: string;
  landmark?: string;
  city: string;
  pincode?: string;
  lat?: number;
  lng?: number;
}

export interface Customer {
  id: ID;
  name: string;
  phone: string;
  email?: string;
  city: string;
  addresses: Address[];
  blocked: boolean;
  createdAt: Timestamp;
}

export type VendorStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type KycDocType = 'aadhaar' | 'pan' | 'driving_license' | 'selfie' | 'bank_proof';
export type DocStatus = 'missing' | 'pending' | 'verified' | 'rejected';

export interface KycDocument {
  type: KycDocType;
  /** Masked on read, e.g. "XXXX XXXX 4821" */
  number?: string;
  imageUri?: string;
  status: DocStatus;
  note?: string;
  uploadedAt?: Timestamp;
}

export interface BankAccount {
  holderName: string;
  /** Stored masked in the mock — only the last 4 digits are kept. */
  accountLast4: string;
  ifsc: string;
  bankName: string;
}

export interface WorkingHours {
  /** "09:00" */
  start: string;
  /** "19:00" */
  end: string;
  /** 0 = Sunday … 6 = Saturday */
  days: number[];
}

export interface Vendor {
  id: ID;
  name: string;
  phone: string;
  email?: string;
  photo?: string;
  city: string;
  serviceAreas: string[];
  categoryIds: ID[];
  status: VendorStatus;
  kyc: KycDocument[];
  bank?: BankAccount;
  available: boolean;
  workingHours: WorkingHours;
  rating: number;
  ratingCount: number;
  jobsCompleted: number;
  location: { lat: number; lng: number };
  joinedAt: Timestamp;
  /** Set when the vendor submits documents for review; cleared if rejected docs need re-upload. */
  kycSubmittedAt?: Timestamp;
  rejectionReason?: string;
}

export interface AdminUser {
  id: ID;
  name: string;
  email: string;
  role: AdminRole;
}

/* ───────────── Bookings & money ───────────── */

export type BookingStatus =
  | 'pending_assignment'
  | 'assigned'
  | 'accepted'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet' | 'cash';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';

export interface PriceBreakdown {
  /** What the customer pays for the work (before tax). */
  serviceAmount: number;
  /** GST charged to the customer on the service amount. */
  tax: number;
  /** serviceAmount + tax */
  total: number;
  commissionRate: number;
  /** Platform's cut of serviceAmount. */
  commission: number;
  /** serviceAmount − commission */
  vendorPayout: number;
}

export interface BookingPayment {
  method?: PaymentMethod;
  status: PaymentStatus;
  paidAt?: Timestamp;
  txnId?: string;
  failureReason?: string;
}

export type BookingEventKind =
  | BookingStatus
  | 'rescheduled'
  | 'reassigned'
  | 'payment_received'
  | 'payment_failed'
  | 'reviewed';

export interface BookingEvent {
  kind: BookingEventKind;
  at: Timestamp;
  by: Role | 'system';
  note?: string;
}

export interface Booking {
  id: ID;
  /** Human-readable, e.g. "PF7K2Q" */
  code: string;
  customerId: ID;
  customerName: string;
  customerPhone: string;
  categoryId: ID;
  problemTypeId: ID;
  /** yyyy-mm-dd */
  date: string;
  /** "10:00 AM" */
  slot: string;
  address: Address;
  notes?: string;
  status: BookingStatus;
  vendorId?: ID;
  price: PriceBreakdown;
  payment: BookingPayment;
  proofPhotos: string[];
  timeline: BookingEvent[];
  createdAt: Timestamp;
  cancelReason?: string;
  reviewId?: ID;
}

export type ReviewStatus = 'published' | 'hidden' | 'flagged';

export interface Review {
  id: ID;
  bookingId: ID;
  customerId: ID;
  customerName: string;
  vendorId: ID;
  categoryId: ID;
  rating: number;
  text: string;
  images: string[];
  status: ReviewStatus;
  createdAt: Timestamp;
}

export type ComplaintStatus = 'open' | 'in_progress' | 'resolved';

export interface Complaint {
  id: ID;
  bookingId: ID;
  customerId: ID;
  vendorId?: ID;
  subject: string;
  message: string;
  status: ComplaintStatus;
  resolution?: string;
  createdAt: Timestamp;
}

export type PayoutStatus = 'pending' | 'processing' | 'settled' | 'failed';

export interface Payout {
  id: ID;
  vendorId: ID;
  amount: number;
  bookingIds: ID[];
  status: PayoutStatus;
  createdAt: Timestamp;
  settledAt?: Timestamp;
  /** Bank reference once settled */
  utr?: string;
}

/* ───────────── Notifications ───────────── */

export type Audience = 'customer' | 'vendor' | 'admin';
export type Channel = 'whatsapp' | 'push' | 'sms' | 'in_app';

export type NotificationKind =
  | 'booking_confirmed'
  | 'vendor_assigned'
  | 'vendor_on_the_way'
  | 'service_completed'
  | 'payment_received'
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'new_assignment'
  | 'job_reminder'
  | 'payout_credited'
  | 'new_booking'
  | 'vendor_pending_approval'
  | 'payment_failed'
  | 'new_complaint';

export interface AppNotification {
  id: ID;
  audience: Audience;
  /** Customer/vendor id, or "admin" for the admin team inbox */
  recipientId: ID;
  kind: NotificationKind;
  title: string;
  body: string;
  channels: Channel[];
  bookingId?: ID;
  /** Pre-filled WhatsApp deep link when channels include "whatsapp" */
  whatsappUrl?: string;
  read: boolean;
  createdAt: Timestamp;
}

/* ───────────── The whole mock database ───────────── */

export interface Database {
  version: number;
  categories: ServiceCategory[];
  problemTypes: ProblemType[];
  customers: Customer[];
  vendors: Vendor[];
  admins: AdminUser[];
  bookings: Booking[];
  reviews: Review[];
  complaints: Complaint[];
  payouts: Payout[];
  notifications: AppNotification[];
  settings: PlatformSettings;
}

export interface PlatformSettings {
  /** GST on services, 0–1 */
  taxRate: number;
  /** Used when a category has no explicit rate */
  defaultCommissionRate: number;
  cities: string[];
  whatsappNumber: string;
  supportPhone: string;
}
