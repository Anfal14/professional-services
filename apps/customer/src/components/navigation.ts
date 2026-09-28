import type { IconName } from '@/data/services';

export interface NavItem {
  label: string;
  href: '/' | '/services' | '/bookings' | '/about' | '/contact';
  icon: IconName;
  activeIcon: IconName;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: 'home-outline', activeIcon: 'home' },
  { label: 'Services', href: '/services', icon: 'grid-outline', activeIcon: 'grid' },
  { label: 'My Bookings', href: '/bookings', icon: 'calendar-outline', activeIcon: 'calendar' },
  { label: 'About', href: '/about', icon: 'information-circle-outline', activeIcon: 'information-circle' },
  { label: 'Contact', href: '/contact', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
];

/**
 * Mobile tab bar links. About and Contact stay reachable from the footer and
 * the account menu, so they are not repeated in the tab bar.
 */
export const BOTTOM_NAV_ITEMS: NavItem[] = NAV_ITEMS.filter(
  (item) => item.href !== '/about' && item.href !== '/contact',
);

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/services') return pathname === '/services' || pathname.startsWith('/service/') || pathname.startsWith('/book/');
  return pathname === href || pathname.startsWith(`${href}/`);
}
