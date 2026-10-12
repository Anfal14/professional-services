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
  /** Visit charge (before GST) for "Other / Not sure" requests; falls back to settings.defaultInspectionFee. */
  inspectionFee?: number;
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
  /** Exact prices for single cities (by city name), used as typed instead of the city's price level. */
  cityPrices?: Record<string, number>;
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
  /**
   * Totals behind the completion rate, counted from booking history by the real backend (see
   * reliabilityOf). Not stored, and absent in the mock, which counts from its own bookings.
   */
  acceptedJobs?: number;
  lateReleases?: number;
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
  | 'reviewed'
  | 'quote_shared'
  | 'quote_approved'
  | 'quote_declined'
  | 'no_work_needed'
  /** The professional took back their last step within the undo window. */
  | 'step_undone'
  /** The professional gave an accepted job back; it returns to the admin's queue. */
  | 'released'
  /** The professional reported a problem on site for the admin to decide. */
  | 'issue_reported'
  | 'issue_resolved';

/** Why a professional gave an accepted job back. */
export type ReleaseReason = 'unwell' | 'vehicle_problem' | 'previous_job_late' | 'wrong_service' | 'other';

/** One release of a booking by a professional who had accepted it. Kept as history — the completion rate is worked out from these. */
export interface JobRelease {
  vendorId: ID;
  vendorName: string;
  reason: ReleaseReason;
  note?: string;
  /** 2 hours or less to the slot, or already on the way. Only late releases lower the completion rate. */
  late: boolean;
  at: Timestamp;
}

/** A problem a professional reports on site instead of releasing: the admin decides what happens. */
export type JobIssueKind = 'customer_unavailable' | 'cant_do' | 'cant_complete';
export type CantCompleteReason = 'needs_part' | 'bigger_problem' | 'safety' | 'other';

export interface JobIssue {
  kind: JobIssueKind;
  /** For "can't complete". */
  reason?: CantCompleteReason;
  note?: string;
  vendorId: ID;
  vendorName: string;
  at: Timestamp;
}

export interface BookingEvent {
  kind: BookingEventKind;
  at: Timestamp;
  by: Role | 'system';
  note?: string;
}

/** One problem fixed during a visit. A cart checkout can put several in one booking. */
export interface BookingItem {
  problemTypeId: ID;
  name: string;
  price: number;
}

/* ───────────── "Other / Not sure" requests ───────────── */

/**
 * pending        → professional has not inspected yet
 * quoted         → professional shared a quote; waiting for the customer (or admin on their behalf)
 * approved       → quote accepted; it replaces the inspection fee
 * declined       → quote rejected; only the inspection fee is billed (a new quote may be shared)
 * no_work_needed → inspected, nothing to fix; only the inspection fee is billed
 */
export type InspectionStatus = 'pending' | 'quoted' | 'approved' | 'declined' | 'no_work_needed';

export interface QuoteLine {
  description: string;
  amount: number;
}

export interface InspectionQuote {
  lines: QuoteLine[];
  /** Sum of lines, before GST. */
  amount: number;
  note?: string;
  vendorId: ID;
  createdAt: Timestamp;
  respondedAt?: Timestamp;
  /** "admin" when support confirmed the customer’s answer by phone. */
  respondedBy?: 'customer' | 'admin';
}

/**
 * What a quote on a booking is for:
 * - not_sure: the customer chose "Other / Not sure" — an inspection visit, then a quote that replaces the inspection fee.
 * - extra_work: a normal booking where the professional found more work on site — a quote added on top of the booked work.
 */
export type QuoteKind = 'not_sure' | 'extra_work';

/**
 * A booking's quote thread. Started by the customer ("Other / Not sure": the professional inspects,
 * then quotes, within the chosen category) or by the professional on site (a quote for extra work).
 */
export interface InspectionRequest {
  /** Absent means not_sure (bookings made before extra-work quotes existed). */
  kind?: QuoteKind;
  /** What the customer described at checkout (required for "Not sure"; empty for extra work). */
  description: string;
  photos: string[];
  /** Visit charge before GST, billed unless a quote is approved. Zero for extra work — the booked work is charged either way. */
  fee: number;
  status: InspectionStatus;
  quote?: InspectionQuote;
  noWorkNote?: string;
}

export interface Booking {
  id: ID;
  /** Human-readable, e.g. "PF7K2Q" */
  code: string;
  customerId: ID;
  customerName: string;
  customerPhone: string;
  categoryId: ID;
  /** The first (primary) problem, if any; `items` lists every known problem in the visit. */
  problemTypeId?: ID;
  items?: BookingItem[];
  /** Present when the customer chose "Other / Not sure" in this category. */
  inspection?: InspectionRequest;
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
  /** "Before" photos — optional. */
  proofPhotos: string[];
  /** "After" photos — at least one is needed before the professional can complete the service. */
  afterPhotos?: string[];
  /**
   * 4-digit code created when the professional arrives. The customer reads it out and the
   * professional enters it to start the service. Never sent to the professional's app.
   */
  startCode?: string;
  /** Wrong start codes entered so far (mock backend bookkeeping; the real backend keeps this server-side). */
  startCodeAttempts?: number;
  /** Every time a professional released this booking after accepting it, oldest first. Admin only. */
  releases?: JobRelease[];
  /** Released late and still waiting for a professional: top of the admin's assignment queue. */
  urgent?: boolean;
  /** An open on-site report waiting for the admin's decision. */
  issue?: JobIssue;
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
  | 'vendor_arrived'
  | 'job_released'
  | 'professional_released'
  | 'job_issue'
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
  | 'new_complaint'
  | 'quote_shared'
  | 'quote_response';

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
  /** Inspection visit charge for "Other / Not sure" when a category has none. */
  defaultInspectionFee: number;
  /** Every city the platform knows, in display order — see {@link City}. */
  cities: City[];
  whatsappNumber: string;
  supportPhone: string;
}

/**
 * live: customers can book. coming_soon: shown as "coming soon"; vendors can already register (to
 * build supply before launch). paused: temporarily closed — no new bookings, existing ones continue.
 */
export type CityStatus = 'live' | 'coming_soon' | 'paused';

export interface City {
  /** Unique and fixed once created — addresses, customers, vendors and bookings store the city by name. */
  name: string;
  state: string;
  status: CityStatus;
  /** City centre. */
  lat: number;
  lng: number;
  /** "Use current location" only matches a city within this distance of its centre. */
  radiusKm: number;
  /** Localities vendors pick as service areas. */
  areas: string[];
  /** Service categories not offered in this city yet (everything else enabled is). */
  disabledCategoryIds: ID[];
  /** Prices here as a percentage of the base price: 100 = base, 120 = 20% dearer. See cityPrice(). */
  priceLevel: number;
  /** Platform commission for bookings in this city, 0–1. Unset → the category's rate. */
  commissionRate?: number;
}
