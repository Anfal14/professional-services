import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';
import { useDb, type Database, type PricingModel } from '@profecian/shared';

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

export function getIssueTitle(service: Service, issueId: string): string {
  if (issueId === OTHER_ISSUE_ID) return 'Other / Not sure';
  return service.issues.find((i) => i.id === issueId)?.title ?? issueId;
}

/** The problem type actually booked: "Not sure" becomes the inspection visit (or the cheapest option). */
export function resolveIssue(service: Service, issueId: string): Issue | undefined {
  if (issueId !== OTHER_ISSUE_ID) return service.issues.find((i) => i.id === issueId);
  return service.issues.find((i) => i.pricingModel === 'inspection') ?? [...service.issues].sort((a, b) => a.price - b.price)[0];
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

/** The "Other / Not sure" option shown as a selectable issue, priced as the visit it books. */
export function otherIssue(service: Service): Issue {
  const booked = resolveIssue(service, OTHER_ISSUE_ID);
  return {
    id: OTHER_ISSUE_ID,
    title: 'Other / Not sure',
    description: 'Our expert will inspect and quote on the spot',
    price: booked?.price ?? service.startingPrice,
    duration: booked?.duration ?? '30 mins',
    icon: 'help-circle-outline',
    pricingModel: 'inspection',
  };
}

export interface CartLine {
  issueId: string;
  issue: Issue;
  /** Problem type actually booked ("Not sure" resolves to the inspection visit). */
  problemTypeId: string;
}

export interface CartGroup {
  service: Service;
  lines: CartLine[];
  /** Distinct problem types to book in one visit. */
  problemTypeIds: string[];
  subtotal: number;
  /** Some prices are "starting at" / inspection — final quote after the visit. */
  estimate: boolean;
}

/** Groups cart items by service (one visit per service), dropping anything no longer offered. */
export function groupCart(services: Service[], items: { serviceId: string; issueId: string }[]): CartGroup[] {
  const groups: CartGroup[] = [];
  for (const item of items) {
    const service = services.find((s) => s.id === item.serviceId);
    if (!service) continue;
    const issue = item.issueId === OTHER_ISSUE_ID ? otherIssue(service) : service.issues.find((i) => i.id === item.issueId);
    const booked = resolveIssue(service, item.issueId);
    if (!issue || !booked) continue;
    let group = groups.find((g) => g.service.id === service.id);
    if (!group) {
      group = { service, lines: [], problemTypeIds: [], subtotal: 0, estimate: false };
      groups.push(group);
    }
    group.lines.push({ issueId: item.issueId, issue, problemTypeId: booked.id });
    if (!group.problemTypeIds.includes(booked.id)) {
      group.problemTypeIds.push(booked.id);
      group.subtotal += booked.price;
    }
    if (issue.pricingModel !== 'fixed') group.estimate = true;
  }
  return groups;
}
