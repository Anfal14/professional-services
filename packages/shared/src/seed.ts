/**
 * Deterministic demo data. Dates are generated relative to "now" so the
 * demo always has today's jobs, upcoming bookings and recent history.
 */
import { CITY_CENTRES, jitterNear } from './geo';
import { toISODate, TIME_SLOTS } from './format';
import { computeBreakdown } from './pricing';
import type {
  AdminUser, AppNotification, Booking, BookingEvent, BookingStatus, Complaint, Customer, Database,
  KycDocument, PaymentMethod, Payout, ProblemType, Review, ServiceCategory, Vendor,
} from './types';

export const DB_VERSION = 4;

/* ───────────── Demo identities (shown as hints on login screens) ───────────── */

export const DEMO = {
  customerPhone: '9876500001',
  vendorPhone: '9876500101',
  pendingVendorPhone: '9876500109',
  adminEmail: 'admin@profecian.app',
  adminPassword: 'Admin@123',
} as const;

/* ───────────── Catalogue ───────────── */

const unsplash = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;

type P = [id: string, name: string, description: string, price: number, mins: number, icon: string, model?: ProblemType['pricingModel']];

const CATALOGUE: (Omit<ServiceCategory, 'enabled' | 'sortOrder' | 'popular'> & { popular?: boolean; problems: P[] })[] = [
  {
    id: 'ac-repair', name: 'AC Repair', tagline: 'Service, gas refill & installation',
    description: 'Certified AC technicians for split & window units — deep servicing, gas top-up, installation and diagnostics with a 30-day warranty.',
    icon: 'snow-outline', image: unsplash('1762341123870-d706f257a12e'), tint: '#E8F4FF', commissionRate: 0.2, popular: true,
    includes: ['Jet-pump deep cleaning', 'Gas pressure check', '30-day warranty', 'Verified technician'],
    problems: [
      ['ac-not-cooling', 'AC not cooling', 'Weak or warm airflow, compressor checks', 499, 60, 'thermometer-outline', 'starting_at'],
      ['ac-service', 'Deep jet service', 'Foam + jet-pump cleaning of indoor unit', 649, 75, 'water-outline'],
      ['ac-gas', 'Gas refill', 'Leak test and complete gas top-up', 2499, 90, 'flask-outline'],
      ['ac-water-leak', 'Water leakage', 'Drain pipe blockage & tray cleaning', 399, 45, 'rainy-outline'],
      ['ac-install', 'Installation / Uninstall', 'Split or window AC fitting', 1299, 120, 'construct-outline'],
      ['ac-noise', 'Noise or bad smell', 'Fan, motor and filter inspection', 449, 60, 'volume-high-outline', 'inspection'],
    ],
  },
  {
    id: 'electrician', name: 'Electrician', tagline: 'Wiring, switches, fans & lights',
    description: 'From a tripping MCB to complete rewiring — background-verified electricians with tools and spares.',
    icon: 'flash-outline', image: unsplash('1621905251189-08b45d6a269e'), tint: '#FFF7E0', commissionRate: 0.18, popular: true,
    includes: ['Safety-first inspection', 'Genuine spare parts', 'Upfront pricing', '30-day warranty'],
    problems: [
      ['el-fan', 'Fan repair', 'Ceiling, exhaust or wall fans', 249, 45, 'sync-outline'],
      ['el-switch', 'Switch repair', 'Replace or repair switchboards', 149, 30, 'toggle-outline'],
      ['el-wiring', 'Wiring', 'Concealed or open wiring per point', 399, 90, 'git-network-outline', 'starting_at'],
      ['el-light', 'Light fitting', 'Tube lights, LEDs, chandeliers', 199, 40, 'bulb-outline'],
      ['el-mcb', 'MCB / fuse tripping', 'Fault finding & MCB replacement', 299, 45, 'warning-outline'],
      ['el-inverter', 'Inverter / stabiliser', 'Installation and connection checks', 349, 60, 'battery-charging-outline'],
    ],
  },
  {
    id: 'plumber', name: 'Plumbing', tagline: 'Leaks, taps, blockages & fittings',
    description: 'Skilled plumbers for leaks, clogged drains, bathroom fittings and tank connections.',
    icon: 'water-outline', image: unsplash('1749532125405-70950966b0e5'), tint: '#E6F7F8', commissionRate: 0.18, popular: true,
    includes: ['Leak detection', 'Quality fittings', 'Post-job cleanup', '30-day warranty'],
    problems: [
      ['pl-leak', 'Leakage', 'Concealed or open pipeline leaks', 399, 60, 'git-commit-outline', 'starting_at'],
      ['pl-tap', 'Tap repair', 'Dripping taps, cartridge replacement', 179, 30, 'water-outline'],
      ['pl-pipe', 'Pipe replacement', 'Replace damaged or old pipe sections', 599, 90, 'construct-outline', 'starting_at'],
      ['pl-block', 'Drain blockage', 'Sink, basin or floor drain unclogging', 299, 45, 'funnel-outline'],
      ['pl-toilet', 'Toilet repair', 'Flush tank, seat and leak fixes', 349, 60, 'home-outline'],
      ['pl-geyser', 'Geyser installation', 'Mounting & inlet/outlet connections', 499, 75, 'flame-outline'],
    ],
  },
  {
    id: 'house-cleaning', name: 'House Cleaning', tagline: 'Deep cleaning for every room',
    description: 'Trained cleaning professionals with mechanised equipment and eco-friendly chemicals.',
    icon: 'sparkles-outline', image: unsplash('1740657254989-42fe9c3b8cce'), tint: '#EAF8EE', commissionRate: 0.22, popular: true,
    includes: ['Eco-friendly chemicals', 'Mechanised scrubbing', 'Trained professionals', 'Re-clean guarantee'],
    problems: [
      ['cl-full', 'Full home deep clean', 'All rooms, kitchen & bathrooms', 3499, 360, 'home-outline'],
      ['cl-bath', 'Bathroom cleaning', 'Tiles, fittings & stain removal', 399, 60, 'water-outline'],
      ['cl-kitchen', 'Kitchen cleaning', 'Degreasing, chimney & cabinets', 1199, 180, 'restaurant-outline'],
      ['cl-sofa', 'Sofa & carpet', 'Shampoo and vacuum extraction', 599, 90, 'bed-outline'],
    ],
  },
  {
    id: 'painting', name: 'Painting', tagline: 'Walls, textures & waterproofing',
    description: 'Professional painters with premium brands, furniture covering and on-time completion.',
    icon: 'color-palette-outline', image: unsplash('1688372199140-cade7ae820fe'), tint: '#FFEDEF', commissionRate: 0.15,
    includes: ['Free site inspection', 'Furniture covering', 'Premium paint brands', '1-year warranty'],
    problems: [
      ['pt-inspect', 'Inspection & quote', 'Expert visit with exact estimate', 999, 45, 'clipboard-outline', 'inspection'],
      ['pt-room', 'Single room painting', 'Walls & ceiling, 2 coats', 4999, 960, 'square-outline', 'starting_at'],
      ['pt-texture', 'Texture / accent wall', 'Designer textures & stencils', 2999, 480, 'brush-outline'],
      ['pt-water', 'Waterproofing', 'Seepage treatment for walls & roof', 3999, 960, 'umbrella-outline', 'starting_at'],
    ],
  },
  {
    id: 'carpenter', name: 'Carpenter', tagline: 'Furniture repair & assembly',
    description: 'Expert carpenters for assembly, door and hinge repairs, shelves and modular fittings.',
    icon: 'hammer-outline', image: unsplash('1595844730298-b960ff98fee0'), tint: '#F7EFE6', commissionRate: 0.18,
    includes: ['Tools & hardware', 'Neat finishing', 'Upfront pricing', '30-day warranty'],
    problems: [
      ['cp-assembly', 'Furniture assembly', 'Beds, wardrobes, tables & more', 499, 90, 'cube-outline'],
      ['cp-door', 'Door repair', 'Hinges, alignment, locks & handles', 249, 45, 'enter-outline'],
      ['cp-drawer', 'Drawer / channel repair', 'Kitchen & wardrobe channels', 199, 30, 'file-tray-outline'],
      ['cp-shelf', 'Shelf & TV mounting', 'Wall shelves and TV units', 349, 60, 'tv-outline'],
    ],
  },
  {
    id: 'pest-control', name: 'Pest Control', tagline: 'Cockroach, termite & bed bugs',
    description: 'Odourless treatments safe for kids and pets, with a free follow-up visit.',
    icon: 'bug-outline', image: unsplash('1747659629851-a92bd71149f6'), tint: '#EEF3E3', commissionRate: 0.2,
    includes: ['Odourless chemicals', 'Kid & pet safe', 'Free follow-up visit', '90-day warranty'],
    problems: [
      ['ps-cockroach', 'Cockroach control', 'Gel + spray treatment for kitchen', 799, 45, 'bug-outline'],
      ['ps-termite', 'Termite treatment', 'Drill-fill-seal anti-termite', 2499, 180, 'leaf-outline'],
      ['ps-bedbug', 'Bed bugs', 'Two-visit intensive treatment', 1499, 90, 'bed-outline'],
      ['ps-mosquito', 'Mosquito control', 'Indoor & outdoor fogging', 999, 60, 'cloud-outline'],
    ],
  },
  {
    id: 'appliance-repair', name: 'Appliance Repair', tagline: 'Washing machine, fridge & more',
    description: 'Brand-trained technicians for washing machines, refrigerators, microwaves, RO purifiers and TVs.',
    icon: 'hardware-chip-outline', image: unsplash('1604335399105-a0c585fd81a1'), tint: '#EEF0FF', commissionRate: 0.2,
    includes: ['All major brands', 'Genuine spares', 'Doorstep diagnosis', '90-day warranty'],
    problems: [
      ['ap-wm', 'Washing machine', 'Not spinning, draining or starting', 349, 60, 'sync-circle-outline', 'starting_at'],
      ['ap-fridge', 'Refrigerator', 'Not cooling, noise or leakage', 349, 60, 'snow-outline', 'starting_at'],
      ['ap-micro', 'Microwave', 'Not heating, sparking, buttons', 299, 45, 'flame-outline'],
      ['ap-ro', 'RO water purifier', 'Service, filter & membrane change', 249, 45, 'water-outline'],
    ],
  },
];

function buildCatalogue(): { categories: ServiceCategory[]; problemTypes: ProblemType[] } {
  const categories: ServiceCategory[] = [];
  const problemTypes: ProblemType[] = [];
  CATALOGUE.forEach(({ problems, popular, ...c }, i) => {
    categories.push({ ...c, popular: !!popular, enabled: true, sortOrder: i });
    for (const [id, name, description, price, durationMins, icon, pricingModel = 'fixed'] of problems) {
      problemTypes.push({ id, categoryId: c.id, name, description, price, durationMins, icon, pricingModel, enabled: true });
    }
  });
  return { categories, problemTypes };
}

/* ───────────── Deterministic randomness ───────────── */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ───────────── People ───────────── */

const CUSTOMER_NAMES = [
  'Priya Sharma', 'Rahul Mehta', 'Ayesha Khan', 'Vikram Joshi', 'Sneha Kulkarni', 'Arjun Nair', 'Meera Iyer',
  'Karan Malhotra', 'Pooja Deshmukh', 'Rohan Gupta', 'Anjali Rao', 'Siddharth Patil', 'Neha Bhosale', 'Imran Shaikh',
];
const STREETS = ['MG Road', 'Station Road', 'Hotgi Road', 'Akkalkot Road', 'FC Road', 'Linking Road', 'Indiranagar 100ft Rd', 'Jubilee Hills Rd 36', 'Civil Lines', 'Rajarampuri'];

const VENDORS: [name: string, city: string, cats: string[], status: Vendor['status']][] = [
  ['Ravi Patil', 'Solapur', ['electrician', 'ac-repair'], 'approved'],
  ['Sunil Jadhav', 'Solapur', ['plumber'], 'approved'],
  ['Mahesh Kamble', 'Solapur', ['house-cleaning', 'pest-control'], 'approved'],
  ['Anil Pawar', 'Solapur', ['appliance-repair', 'ac-repair'], 'approved'],
  ['Deepak More', 'Pune', ['electrician'], 'approved'],
  ['Farhan Qureshi', 'Pune', ['plumber', 'carpenter'], 'approved'],
  ['Lakshmi Reddy', 'Hyderabad', ['house-cleaning'], 'approved'],
  ['Joseph D’Souza', 'Mumbai', ['painting', 'carpenter'], 'approved'],
  ['Suresh Gowda', 'Bengaluru', ['ac-repair', 'appliance-repair'], 'suspended'],
  ['Kiran Shinde', 'Solapur', ['carpenter', 'painting'], 'pending'],
  ['Asif Mulla', 'Kolhapur', ['electrician', 'plumber'], 'pending'],
  ['Ganesh Waghmare', 'Nagpur', ['pest-control'], 'rejected'],
];

const ADMINS: AdminUser[] = [
  { id: 'adm_1', name: 'Aditi Verma', email: DEMO.adminEmail, role: 'super_admin' },
  { id: 'adm_2', name: 'Nikhil Rao', email: 'ops@profecian.app', role: 'operations' },
  { id: 'adm_3', name: 'Sana Kapoor', email: 'finance@profecian.app', role: 'finance' },
  { id: 'adm_4', name: 'Rohit Das', email: 'support@profecian.app', role: 'support' },
];

function kycFor(status: Vendor['status'], rnd: () => number, at: string): KycDocument[] {
  const docStatus: KycDocument['status'] =
    status === 'approved' || status === 'suspended' ? 'verified' : status === 'rejected' ? 'rejected' : 'pending';
  const n = () => `${Math.floor(1000 + rnd() * 8999)}`;
  return [
    { type: 'aadhaar', number: `XXXX XXXX ${n()}`, status: docStatus, uploadedAt: at },
    { type: 'pan', number: `XXXXX${n()}X`, status: docStatus, uploadedAt: at, note: status === 'rejected' ? 'Name mismatch with Aadhaar' : undefined },
    { type: 'driving_license', number: `MH13 ${n()}`, status: status === 'pending' ? 'pending' : docStatus, uploadedAt: at },
    { type: 'selfie', status: docStatus, uploadedAt: at },
    { type: 'bank_proof', status: docStatus, uploadedAt: at },
  ];
}

/* ───────────── Build ───────────── */

export function createSeedDatabase(now = new Date()): Database {
  const rnd = mulberry32(20260928);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];
  const iso = (d: Date) => d.toISOString();
  const daysAgo = (n: number, hour = 10) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    d.setHours(hour, Math.floor(rnd() * 60), 0, 0);
    return d;
  };

  const { categories, problemTypes } = buildCatalogue();
  const catById = new Map(categories.map((c) => [c.id, c]));
  const settings: Database['settings'] = {
    taxRate: 0.18,
    defaultCommissionRate: 0.2,
    cities: Object.keys(CITY_CENTRES),
    whatsappNumber: '919876543210',
    supportPhone: '+91 98765 43210',
  };

  const customers: Customer[] = CUSTOMER_NAMES.map((name, i) => {
    const city = i < 6 ? 'Solapur' : pick(['Pune', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Solapur']);
    const id = `cus_${i + 1}`;
    const line = `${10 + i * 7}, ${pick(['Shivaji Nagar', 'Sadar Bazar', 'Vijapur Naka', 'Green Park', 'Lake View'])}, ${pick(STREETS)}`;
    return {
      id,
      name,
      phone: i === 0 ? DEMO.customerPhone : `98765${String(10 + i).padStart(5, '0')}`,
      email: `${name.split(' ')[0].toLowerCase()}@example.com`,
      city,
      addresses: [{ id: `adr_${id}`, label: 'Home', line, city, pincode: `41300${i % 10}`, ...jitterNear(city, id) }],
      blocked: i === 12,
      createdAt: iso(daysAgo(90 - i * 5)),
    };
  });

  const vendors: Vendor[] = VENDORS.map(([name, city, cats, status], i) => {
    const id = `ven_${i + 1}`;
    const joined = iso(daysAgo(status === 'pending' ? 2 + i : 120 - i * 6));
    return {
      id,
      name,
      phone: i === 0 ? DEMO.vendorPhone : i === 9 ? DEMO.pendingVendorPhone : `98765${String(100 + i).padStart(5, '0')}`,
      city,
      serviceAreas: city === 'Solapur' ? ['Sadar Bazar', 'Hotgi Road', 'Vijapur Naka'].slice(0, 2 + (i % 2)) : [city],
      categoryIds: cats,
      status,
      kyc: kycFor(status, rnd, joined),
      bank: status === 'pending' && i === 10 ? undefined : { holderName: name, accountLast4: `${4000 + i * 37}`.slice(-4), ifsc: `SBIN000${1200 + i}`, bankName: pick(['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Bank of Maharashtra']) },
      available: status === 'approved' && i !== 3,
      workingHours: { start: '09:00', end: '19:00', days: [1, 2, 3, 4, 5, 6] },
      rating: 0,
      ratingCount: 0,
      jobsCompleted: 0,
      location: jitterNear(city, id),
      joinedAt: joined,
      kycSubmittedAt: joined,
      rejectionReason: status === 'rejected' ? 'PAN name does not match Aadhaar' : undefined,
    };
  });
  const approved = vendors.filter((v) => v.status === 'approved' || v.status === 'suspended');

  const bookings: Booking[] = [];
  const reviews: Review[] = [];
  const complaints: Complaint[] = [];

  const METHODS: PaymentMethod[] = ['upi', 'upi', 'cash', 'card', 'cash', 'netbanking', 'wallet'];
  const REVIEW_TEXT = [
    'Very professional and on time. Fixed the issue quickly.',
    'Good work, cleaned up after the job. Would book again.',
    'Explained the problem clearly and the pricing was as quoted.',
    'Took a bit longer than expected but the result is great.',
    'Excellent service, polite and skilled.',
    'Average experience, had to call twice for directions.',
  ];

  const makeBooking = (i: number, opts: { dayOffset: number; status: BookingStatus; customer?: Customer; vendor?: Vendor; categoryId?: string }) => {
    const customer = opts.customer ?? pick(customers.slice(0, 12));
    const vendorPool = approved.filter((v) => v.city === customer.city);
    const vendor = opts.vendor ?? (opts.status === 'pending_assignment' ? undefined : pick(vendorPool.length ? vendorPool : approved));
    const categoryId = opts.categoryId ?? (vendor ? pick(vendor.categoryIds) : pick(categories).id);
    const category = catById.get(categoryId)!;
    const problem = pick(problemTypes.filter((p) => p.categoryId === categoryId));
    const date = new Date(now);
    date.setDate(date.getDate() + opts.dayOffset);
    const slot = opts.dayOffset === 0 ? pick(TIME_SLOTS.slice(6)) : pick(TIME_SLOTS);
    // History is booked the day before; upcoming bookings were placed over the last few days.
    const created = daysAgo(opts.dayOffset < 0 ? -opts.dayOffset + 1 : 1 + (i % 5), 9);
    const price = computeBreakdown(problem.price, category.commissionRate, settings.taxRate);
    const method = pick(METHODS);
    const id = `bkg_${i}`;
    const timeline: BookingEvent[] = [{ kind: 'pending_assignment', at: iso(created), by: 'customer', note: 'Booking placed' }];
    const flow: BookingStatus[] = ['assigned', 'accepted', 'on_the_way', 'arrived', 'in_progress', 'completed'];
    const target = opts.status === 'cancelled' ? (rnd() < 0.5 ? 'assigned' : 'pending_assignment') : opts.status;
    let t = created.getTime();
    for (const s of flow) {
      if (target === 'pending_assignment') break;
      t += 20 * 60_000 + rnd() * 90 * 60_000;
      timeline.push({ kind: s, at: new Date(t).toISOString(), by: s === 'assigned' ? 'admin' : 'vendor' });
      if (s === target) break;
    }
    const completed = opts.status === 'completed';
    if (opts.status === 'cancelled') timeline.push({ kind: 'cancelled', at: new Date(t + 3_600_000).toISOString(), by: 'customer', note: 'Plans changed' });
    const paid = completed && !(i % 17 === 0);
    if (paid) timeline.push({ kind: 'payment_received', at: new Date(t + 600_000).toISOString(), by: 'system' });
    const booking: Booking = {
      id,
      code: `PF${(1000 + i).toString(36).toUpperCase()}${String.fromCharCode(65 + (i % 26))}`,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      categoryId,
      problemTypeId: problem.id,
      date: toISODate(date),
      slot,
      address: customer.addresses[0],
      status: opts.status,
      vendorId: opts.status === 'cancelled' && target === 'pending_assignment' ? undefined : vendor?.id,
      price,
      payment: completed
        ? paid
          ? { method, status: 'paid', paidAt: new Date(t + 600_000).toISOString(), txnId: method === 'cash' ? undefined : `pay_${id}` }
          : { method: 'upi', status: 'failed', failureReason: 'UPI request expired' }
        : opts.status === 'cancelled'
          ? { status: 'unpaid' }
          : { method: rnd() < 0.5 ? 'cash' : undefined, status: 'unpaid' },
      proofPhotos: [],
      timeline,
      createdAt: iso(created),
      cancelReason: opts.status === 'cancelled' ? 'Plans changed' : undefined,
    };
    bookings.push(booking);
    if (completed && vendor && rnd() < 0.75) {
      const rating = rnd() < 0.15 ? 3 : rnd() < 0.5 ? 4 : 5;
      const review: Review = {
        id: `rev_${i}`, bookingId: id, customerId: customer.id, customerName: customer.name, vendorId: vendor.id, categoryId,
        rating, text: rating === 3 ? REVIEW_TEXT[5] : pick(REVIEW_TEXT.slice(0, 5)), images: [],
        status: i % 23 === 0 ? 'flagged' : 'published', createdAt: new Date(t + 7_200_000).toISOString(),
      };
      reviews.push(review);
      booking.reviewId = review.id;
      booking.timeline.push({ kind: 'reviewed', at: review.createdAt, by: 'customer' });
    }
    return booking;
  };

  let n = 1;
  // History: ~70 bookings over the last 60 days, mostly completed.
  for (let d = 60; d >= 1; d--) {
    const count = rnd() < 0.3 ? 2 : 1;
    for (let k = 0; k < count; k++) makeBooking(n++, { dayOffset: -d, status: rnd() < 0.1 ? 'cancelled' : 'completed' });
  }
  // Demo customer history + upcoming.
  const demoCustomer = customers[0];
  const demoVendor = vendors[0];
  makeBooking(n++, { dayOffset: -12, status: 'completed', customer: demoCustomer, vendor: demoVendor, categoryId: 'ac-repair' });
  makeBooking(n++, { dayOffset: -4, status: 'completed', customer: demoCustomer, vendor: vendors[1], categoryId: 'plumber' });
  makeBooking(n++, { dayOffset: 0, status: 'on_the_way', customer: demoCustomer, vendor: demoVendor, categoryId: 'electrician' });
  makeBooking(n++, { dayOffset: 2, status: 'pending_assignment', customer: demoCustomer, categoryId: 'house-cleaning' });
  // Demo vendor's queue: today + upcoming.
  makeBooking(n++, { dayOffset: 0, status: 'assigned', vendor: demoVendor, customer: customers[2], categoryId: 'ac-repair' });
  makeBooking(n++, { dayOffset: 0, status: 'accepted', vendor: demoVendor, customer: customers[3], categoryId: 'electrician' });
  makeBooking(n++, { dayOffset: 1, status: 'assigned', vendor: demoVendor, customer: customers[4], categoryId: 'electrician' });
  makeBooking(n++, { dayOffset: 3, status: 'accepted', vendor: demoVendor, customer: customers[5], categoryId: 'ac-repair' });
  // Admin queue: unassigned requests across cities.
  for (let k = 0; k < 6; k++) makeBooking(n++, { dayOffset: k % 3, status: 'pending_assignment' });
  for (let k = 0; k < 4; k++) makeBooking(n++, { dayOffset: k % 2, status: pick(['assigned', 'accepted', 'in_progress'] as const) });

  // Vendor aggregates from reviews + completed jobs.
  for (const v of vendors) {
    const mine = reviews.filter((r) => r.vendorId === v.id && r.status === 'published');
    v.ratingCount = mine.length;
    v.rating = mine.length ? Math.round((mine.reduce((s, r) => s + r.rating, 0) / mine.length) * 10) / 10 : 0;
    v.jobsCompleted = bookings.filter((b) => b.vendorId === v.id && b.status === 'completed').length;
  }

  // Weekly settled payouts for online-paid jobs older than 7 days; recent ones stay pending settlement.
  const payouts: Payout[] = [];
  for (const v of approved) {
    const eligible = bookings.filter(
      (b) => b.vendorId === v.id && b.status === 'completed' && b.payment.status === 'paid' && b.payment.method !== 'cash' && new Date(b.createdAt) < daysAgo(7),
    );
    for (let w = 0; w < 8; w++) {
      const batch = eligible.filter((b) => {
        const age = (now.getTime() - new Date(b.createdAt).getTime()) / 86_400_000;
        return age >= 7 + w * 7 && age < 14 + w * 7;
      });
      if (!batch.length) continue;
      const amount = Math.round(batch.reduce((s, b) => s + b.price.vendorPayout, 0) * 100) / 100;
      payouts.push({
        id: `pay_${v.id}_${w}`, vendorId: v.id, amount, bookingIds: batch.map((b) => b.id), status: 'settled',
        createdAt: iso(daysAgo(7 + w * 7, 11)), settledAt: iso(daysAgo(6 + w * 7, 15)), utr: `UTR${Math.floor(1e9 + rnd() * 8e9)}`,
      });
    }
  }

  complaints.push(
    { id: 'cmp_1', bookingId: bookings[5].id, customerId: bookings[5].customerId, vendorId: bookings[5].vendorId, subject: 'Issue came back after 2 days', message: 'The tap started leaking again. Please send someone to check under warranty.', status: 'open', createdAt: iso(daysAgo(1, 18)) },
    { id: 'cmp_2', bookingId: bookings[12].id, customerId: bookings[12].customerId, vendorId: bookings[12].vendorId, subject: 'Professional arrived late', message: 'Came 1.5 hours after the slot without informing.', status: 'in_progress', createdAt: iso(daysAgo(4, 12)) },
    { id: 'cmp_3', bookingId: bookings[20].id, customerId: bookings[20].customerId, vendorId: bookings[20].vendorId, subject: 'Charged extra for parts', message: 'Was asked to pay ₹200 extra in cash for a switch.', status: 'resolved', resolution: 'Refunded ₹200 and warned the vendor.', createdAt: iso(daysAgo(15, 10)) },
  );

  const notifications: AppNotification[] = [
    { id: 'ntf_seed_1', audience: 'admin', recipientId: 'admin', kind: 'vendor_pending_approval', title: 'Vendor pending approval', body: `${vendors[9].name} (${vendors[9].city}) submitted KYC documents.`, channels: ['in_app'], read: false, createdAt: iso(daysAgo(0, 8)) },
    { id: 'ntf_seed_2', audience: 'admin', recipientId: 'admin', kind: 'payment_failed', title: 'Payment failed', body: 'UPI payment for a completed booking expired — follow up with the customer.', channels: ['in_app'], read: false, createdAt: iso(daysAgo(1, 16)) },
  ];

  return {
    version: DB_VERSION,
    categories,
    problemTypes,
    customers,
    vendors,
    admins: ADMINS,
    bookings: bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    reviews,
    complaints,
    payouts,
    notifications,
    settings,
  };
}
