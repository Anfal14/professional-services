import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface Issue {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  icon: IconName;
}

export interface Service {
  id: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
  icon: IconName;
  tint: string;
  rating: number;
  reviews: string;
  startingPrice: number;
  eta: string;
  popular?: boolean;
  includes: string[];
  issues: Issue[];
}

/** Unsplash images (free licence), sized for fast mobile loading. */
const unsplash = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;

export const HERO_IMAGE = unsplash('1631679706909-1844bbd07221', 1800);
export const ABOUT_IMAGE = unsplash('1548838670-cb67b43a6adb', 1400);
export const TECH_IMAGE = unsplash('1649768870222-17848797d6b4', 1000);

export const OTHER_ISSUE_ID = 'other';

export const services: Service[] = [
  {
    id: 'ac-repair',
    name: 'AC Repair',
    tagline: 'Service, gas refill & installation',
    description:
      'Certified AC technicians for split & window units. Deep jet-pump servicing, gas top-up, installation and complete diagnostics with a 30-day service warranty.',
    image: unsplash('1762341123870-d706f257a12e'),
    icon: 'snow-outline',
    tint: '#E8F4FF',
    rating: 4.8,
    reviews: '128K',
    startingPrice: 499,
    eta: '45 mins',
    popular: true,
    includes: ['Jet-pump deep cleaning', 'Gas pressure check', '30-day warranty', 'Verified technician'],
    issues: [
      { id: 'ac-not-cooling', title: 'AC not cooling', description: 'Weak or warm airflow, compressor checks', price: 499, duration: '60 min', icon: 'thermometer-outline' },
      { id: 'ac-service', title: 'Deep jet service', description: 'Foam + jet-pump cleaning of indoor unit', price: 649, duration: '75 min', icon: 'water-outline' },
      { id: 'ac-gas', title: 'Gas refill', description: 'Leak test and complete gas top-up', price: 2499, duration: '90 min', icon: 'flask-outline' },
      { id: 'ac-water-leak', title: 'Water leakage', description: 'Drain pipe blockage & tray cleaning', price: 399, duration: '45 min', icon: 'rainy-outline' },
      { id: 'ac-install', title: 'Installation / Uninstall', description: 'Split or window AC fitting', price: 1299, duration: '120 min', icon: 'construct-outline' },
      { id: 'ac-noise', title: 'Noise or bad smell', description: 'Fan, motor and filter inspection', price: 449, duration: '60 min', icon: 'volume-high-outline' },
    ],
  },
  {
    id: 'electrician',
    name: 'Electrician',
    tagline: 'Wiring, switches, fans & lights',
    description:
      'From a tripping MCB to complete rewiring — background-verified electricians who arrive with tools and spares, following strict safety protocols.',
    image: unsplash('1621905251189-08b45d6a269e'),
    icon: 'flash-outline',
    tint: '#FFF7E0',
    rating: 4.8,
    reviews: '96K',
    startingPrice: 149,
    eta: '30 mins',
    popular: true,
    includes: ['Safety-first inspection', 'Genuine spare parts', 'Upfront pricing', '30-day warranty'],
    issues: [
      { id: 'el-switch', title: 'Switch / socket repair', description: 'Replace or repair switchboards', price: 149, duration: '30 min', icon: 'toggle-outline' },
      { id: 'el-fan', title: 'Fan installation / repair', description: 'Ceiling, exhaust or wall fans', price: 249, duration: '45 min', icon: 'sync-outline' },
      { id: 'el-light', title: 'Light fitting', description: 'Tube lights, LEDs, chandeliers', price: 199, duration: '40 min', icon: 'bulb-outline' },
      { id: 'el-mcb', title: 'MCB / fuse tripping', description: 'Fault finding & MCB replacement', price: 299, duration: '45 min', icon: 'warning-outline' },
      { id: 'el-wiring', title: 'New wiring', description: 'Concealed or open wiring per point', price: 399, duration: '90 min', icon: 'git-network-outline' },
      { id: 'el-inverter', title: 'Inverter / stabiliser', description: 'Installation and connection checks', price: 349, duration: '60 min', icon: 'battery-charging-outline' },
    ],
  },
  {
    id: 'plumber',
    name: 'Plumber',
    tagline: 'Leaks, taps, blockages & fittings',
    description:
      'Skilled plumbers for leaking taps, clogged drains, bathroom fittings and water tank connections — neat work and a spotless cleanup after.',
    image: unsplash('1749532125405-70950966b0e5'),
    icon: 'water-outline',
    tint: '#E6F7F8',
    rating: 4.7,
    reviews: '74K',
    startingPrice: 179,
    eta: '40 mins',
    popular: true,
    includes: ['Leak detection', 'Quality fittings', 'Post-job cleanup', '30-day warranty'],
    issues: [
      { id: 'pl-tap', title: 'Tap / mixer repair', description: 'Dripping taps, cartridge replacement', price: 179, duration: '30 min', icon: 'water-outline' },
      { id: 'pl-block', title: 'Drain blockage', description: 'Sink, basin or floor drain unclogging', price: 299, duration: '45 min', icon: 'funnel-outline' },
      { id: 'pl-toilet', title: 'Toilet repair', description: 'Flush tank, seat and leak fixes', price: 349, duration: '60 min', icon: 'home-outline' },
      { id: 'pl-leak', title: 'Pipe leakage', description: 'Concealed or open pipeline leaks', price: 399, duration: '60 min', icon: 'git-commit-outline' },
      { id: 'pl-geyser', title: 'Geyser installation', description: 'Mounting & inlet/outlet connections', price: 499, duration: '75 min', icon: 'flame-outline' },
      { id: 'pl-tank', title: 'Water tank / motor', description: 'Motor connections & tank fittings', price: 449, duration: '60 min', icon: 'cube-outline' },
    ],
  },
  {
    id: 'house-cleaning',
    name: 'House Cleaning',
    tagline: 'Deep cleaning for every room',
    description:
      'Trained cleaning professionals with mechanised equipment and safe, eco-friendly chemicals for a spotless, hygienic home.',
    image: unsplash('1740657254989-42fe9c3b8cce'),
    icon: 'sparkles-outline',
    tint: '#EAF8EE',
    rating: 4.8,
    reviews: '112K',
    startingPrice: 399,
    eta: '60 mins',
    popular: true,
    includes: ['Eco-friendly chemicals', 'Mechanised scrubbing', 'Trained professionals', 'Re-clean guarantee'],
    issues: [
      { id: 'cl-full', title: 'Full home deep clean', description: 'All rooms, kitchen & bathrooms', price: 3499, duration: '6 hrs', icon: 'home-outline' },
      { id: 'cl-bath', title: 'Bathroom cleaning', description: 'Tiles, fittings & stain removal', price: 399, duration: '60 min', icon: 'water-outline' },
      { id: 'cl-kitchen', title: 'Kitchen cleaning', description: 'Degreasing, chimney & cabinets', price: 1199, duration: '3 hrs', icon: 'restaurant-outline' },
      { id: 'cl-sofa', title: 'Sofa & carpet', description: 'Shampoo and vacuum extraction', price: 599, duration: '90 min', icon: 'bed-outline' },
      { id: 'cl-move', title: 'Move-in / move-out', description: 'Empty home intensive cleaning', price: 2999, duration: '5 hrs', icon: 'cube-outline' },
    ],
  },
  {
    id: 'painting',
    name: 'Painting',
    tagline: 'Walls, textures & waterproofing',
    description:
      'Professional painters with premium brands, furniture covering and on-time completion. Free colour consultation and site inspection.',
    image: unsplash('1688372199140-cade7ae820fe'),
    icon: 'color-palette-outline',
    tint: '#FFEDEF',
    rating: 4.7,
    reviews: '38K',
    startingPrice: 999,
    eta: 'Same day visit',
    includes: ['Free site inspection', 'Furniture covering', 'Premium paint brands', '1-year warranty'],
    issues: [
      { id: 'pt-room', title: 'Single room painting', description: 'Walls & ceiling, 2 coats', price: 4999, duration: '1–2 days', icon: 'square-outline' },
      { id: 'pt-full', title: 'Full home painting', description: 'Interior painting for 2/3 BHK', price: 18999, duration: '5–7 days', icon: 'home-outline' },
      { id: 'pt-texture', title: 'Texture / accent wall', description: 'Designer textures & stencils', price: 2999, duration: '1 day', icon: 'brush-outline' },
      { id: 'pt-water', title: 'Waterproofing', description: 'Seepage treatment for walls & roof', price: 3999, duration: '1–2 days', icon: 'umbrella-outline' },
      { id: 'pt-inspect', title: 'Inspection & quote', description: 'Expert visit with exact estimate', price: 999, duration: '45 min', icon: 'clipboard-outline' },
    ],
  },
  {
    id: 'carpenter',
    name: 'Carpenter',
    tagline: 'Furniture repair & assembly',
    description:
      'Expert carpenters for furniture assembly, door and hinge repairs, custom shelves and modular fittings — precise, sturdy and clean.',
    image: unsplash('1595844730298-b960ff98fee0'),
    icon: 'hammer-outline',
    tint: '#F7EFE6',
    rating: 4.7,
    reviews: '41K',
    startingPrice: 199,
    eta: '45 mins',
    includes: ['Tools & hardware', 'Neat finishing', 'Upfront pricing', '30-day warranty'],
    issues: [
      { id: 'cp-assembly', title: 'Furniture assembly', description: 'Beds, wardrobes, tables & more', price: 499, duration: '90 min', icon: 'cube-outline' },
      { id: 'cp-door', title: 'Door repair', description: 'Hinges, alignment, locks & handles', price: 249, duration: '45 min', icon: 'enter-outline' },
      { id: 'cp-drawer', title: 'Drawer / channel repair', description: 'Kitchen & wardrobe channels', price: 199, duration: '30 min', icon: 'file-tray-outline' },
      { id: 'cp-shelf', title: 'Shelf & TV mounting', description: 'Wall shelves and TV units', price: 349, duration: '60 min', icon: 'tv-outline' },
      { id: 'cp-custom', title: 'Custom furniture', description: 'Consultation for made-to-measure work', price: 699, duration: '60 min', icon: 'construct-outline' },
    ],
  },
  {
    id: 'pest-control',
    name: 'Pest Control',
    tagline: 'Cockroach, termite & bed bugs',
    description:
      'Government-approved, odourless treatments that are safe for kids and pets. Long-lasting protection with a free follow-up visit.',
    image: unsplash('1747659629851-a92bd71149f6'),
    icon: 'bug-outline',
    tint: '#EEF3E3',
    rating: 4.8,
    reviews: '52K',
    startingPrice: 799,
    eta: '60 mins',
    includes: ['Odourless chemicals', 'Kid & pet safe', 'Free follow-up visit', '90-day warranty'],
    issues: [
      { id: 'ps-cockroach', title: 'Cockroach control', description: 'Gel + spray treatment for kitchen', price: 799, duration: '45 min', icon: 'bug-outline' },
      { id: 'ps-termite', title: 'Termite treatment', description: 'Drill-fill-seal anti-termite', price: 2499, duration: '3 hrs', icon: 'leaf-outline' },
      { id: 'ps-bedbug', title: 'Bed bugs', description: 'Two-visit intensive treatment', price: 1499, duration: '90 min', icon: 'bed-outline' },
      { id: 'ps-mosquito', title: 'Mosquito control', description: 'Indoor & outdoor fogging', price: 999, duration: '60 min', icon: 'cloud-outline' },
      { id: 'ps-rodent', title: 'Rodent control', description: 'Baiting & entry point sealing', price: 1199, duration: '60 min', icon: 'paw-outline' },
    ],
  },
  {
    id: 'appliance-repair',
    name: 'Appliance Repair',
    tagline: 'Washing machine, fridge & more',
    description:
      'Brand-trained technicians for washing machines, refrigerators, microwaves, RO purifiers and TVs, using genuine spare parts.',
    image: unsplash('1604335399105-a0c585fd81a1'),
    icon: 'hardware-chip-outline',
    tint: '#EEF0FF',
    rating: 4.7,
    reviews: '66K',
    startingPrice: 249,
    eta: '60 mins',
    includes: ['All major brands', 'Genuine spares', 'Doorstep diagnosis', '90-day warranty'],
    issues: [
      { id: 'ap-wm', title: 'Washing machine', description: 'Not spinning, draining or starting', price: 349, duration: '60 min', icon: 'sync-circle-outline' },
      { id: 'ap-fridge', title: 'Refrigerator', description: 'Not cooling, noise or leakage', price: 349, duration: '60 min', icon: 'snow-outline' },
      { id: 'ap-micro', title: 'Microwave', description: 'Not heating, sparking, buttons', price: 299, duration: '45 min', icon: 'flame-outline' },
      { id: 'ap-ro', title: 'RO water purifier', description: 'Service, filter & membrane change', price: 249, duration: '45 min', icon: 'water-outline' },
      { id: 'ap-tv', title: 'Television', description: 'Display, sound & wall mounting', price: 399, duration: '60 min', icon: 'tv-outline' },
      { id: 'ap-chimney', title: 'Kitchen chimney', description: 'Deep cleaning & motor repair', price: 599, duration: '75 min', icon: 'cloudy-outline' },
    ],
  },
];

export function getService(id: string | undefined): Service | undefined {
  return services.find((s) => s.id === id);
}

export function getIssueTitle(service: Service, issueId: string): string {
  if (issueId === OTHER_ISSUE_ID) return 'Other / Not sure';
  return service.issues.find((i) => i.id === issueId)?.title ?? issueId;
}

export function searchServices(query: string): Service[] {
  const q = query.trim().toLowerCase();
  if (!q) return services;
  return services.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.tagline.toLowerCase().includes(q) ||
      s.issues.some((i) => i.title.toLowerCase().includes(q)),
  );
}

export const stats = [
  { value: '50K+', label: 'Verified pros' },
  { value: '4.8', label: 'Average rating' },
  { value: '2M+', label: 'Happy homes' },
  { value: '30+', label: 'Cities' },
];

export const testimonials = [
  {
    name: 'Priya S.',
    city: 'Bengaluru',
    text: 'The AC technician arrived in 40 minutes, explained everything and left the place spotless. Booking on QuickJob is ridiculously easy.',
    service: 'AC Repair',
  },
  {
    name: 'Rahul M.',
    city: 'Pune',
    text: 'Got my whole kitchen deep cleaned. Transparent pricing, polite staff and I received the WhatsApp confirmation instantly.',
    service: 'House Cleaning',
  },
  {
    name: 'Ayesha K.',
    city: 'Hyderabad',
    text: 'Electrician fixed three switchboards and a fan in one visit. Finally a service I can trust with my home.',
    service: 'Electrician',
  },
];
