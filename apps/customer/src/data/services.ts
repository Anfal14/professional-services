import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';
import { inspectionFeeFor, useDb, type Database, type PricingModel } from '@profecian/shared';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface Issue {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  icon: IconName;
  pricingModel: PricingModel;
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
  /** Visit charge (before GST) for "Other / Not sure". */
  inspectionFee: number;
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

/** "Not sure" choice on the service screen — booked as the category's inspection visit. */
export const OTHER_ISSUE_ID = 'other';

const formatDuration = (mins: number) => (mins >= 1440 ? `${Math.round(mins / 480)} days` : mins >= 120 ? `${Math.round(mins / 60)} hrs` : `${mins} min`);
const formatCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

/**
 * Maps the admin-managed catalogue (@profecian/shared) to the Service shape
 * the customer screens use. Only enabled categories/problem types appear.
 */
export function buildServices(db: Database): Service[] {
  return [...db.categories]
    .filter((c) => c.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => {
      const problems = db.problemTypes.filter((p) => p.categoryId === c.id && p.enabled);
      const reviews = db.reviews.filter((r) => r.categoryId === c.id && r.status === 'published');
      const rating = reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : 4.8;
      return {
        id: c.id,
        name: c.name,
        tagline: c.tagline,
        description: c.description,
        image: c.image,
        icon: c.icon as IconName,
        tint: c.tint,
        rating,
        reviews: formatCount(reviews.length),
        startingPrice: problems.length ? Math.min(...problems.map((p) => p.price)) : 0,
        inspectionFee: inspectionFeeFor(c, db.settings),
        eta: '45 mins',
        popular: c.popular,
        includes: c.includes,
        issues: problems.map((p) => ({
          id: p.id,
          title: p.name,
          description: p.description,
          price: p.price,
          duration: formatDuration(p.durationMins),
          icon: p.icon as IconName,
          pricingModel: p.pricingModel,
        })),
      };
    })
    .filter((s) => s.issues.length > 0);
}


export function useCatalog() {
  const db = useDb();
  return useMemo(() => {
    const services = buildServices(db);
    return {
      services,
      getService: (id: string | undefined) => services.find((s) => s.id === id),
      searchServices: (query: string) => {
        const q = query.trim().toLowerCase();
        if (!q) return services;
        return services.filter(
          (s) => s.name.toLowerCase().includes(q) || s.tagline.toLowerCase().includes(q) || s.issues.some((i) => i.title.toLowerCase().includes(q)),
        );
      },
    };
  }, [db]);
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
    text: 'The AC technician arrived in 40 minutes, explained everything and left the place spotless. Booking on Profecian is ridiculously easy.',
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

/**
 * "Other / Not sure" shown as a selectable option. It is not a problem type:
 * the booking keeps the category and carries an inspection request instead,
 * priced at the category's inspection fee until the customer approves a quote.
 */
export function otherIssue(service: Service): Issue {
  return {
    id: OTHER_ISSUE_ID,
    title: 'Other / Not sure',
    description: 'Describe it at checkout — the expert inspects and quotes before any work',
    price: service.inspectionFee,
    duration: 'Quote on site',
    icon: 'help-circle-outline',
    pricingModel: 'inspection',
  };
}

export interface CartLine {
  issueId: string;
  issue: Issue;
}

export interface CartGroup {
  service: Service;
  lines: CartLine[];
  /** Known problems booked in this visit. */
  problemTypeIds: string[];
  /** The customer also picked "Other / Not sure" for this service. */
  notSure: boolean;
  /** Pre-tax amount: known problems + inspection fee when not sure. */
  subtotal: number;
  /** Some prices are "starting at" / inspection — final amount confirmed on site. */
  estimate: boolean;
}

/** Groups cart items by service (one visit per service), dropping anything no longer offered. */
export function groupCart(services: Service[], items: { serviceId: string; issueId: string }[]): CartGroup[] {
  const groups: CartGroup[] = [];
  for (const item of items) {
    const service = services.find((s) => s.id === item.serviceId);
    if (!service) continue;
    const notSure = item.issueId === OTHER_ISSUE_ID;
    const issue = notSure ? otherIssue(service) : service.issues.find((i) => i.id === item.issueId);
    if (!issue) continue;
    let group = groups.find((g) => g.service.id === service.id);
    if (!group) {
      group = { service, lines: [], problemTypeIds: [], notSure: false, subtotal: 0, estimate: false };
      groups.push(group);
    }
    group.lines.push({ issueId: item.issueId, issue });
    if (notSure) {
      if (!group.notSure) group.subtotal += service.inspectionFee;
      group.notSure = true;
    } else if (!group.problemTypeIds.includes(issue.id)) {
      group.problemTypeIds.push(issue.id);
      group.subtotal += issue.price;
    }
    if (issue.pricingModel !== 'fixed') group.estimate = true;
  }
  return groups;
}
