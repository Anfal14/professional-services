import { useWindowDimensions } from 'react-native';

export const breakpoints = { md: 768, lg: 1024 } as const;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isMobile = width < breakpoints.md;
  const isTablet = width >= breakpoints.md && width < breakpoints.lg;
  const isDesktop = width >= breakpoints.lg;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    /** Horizontal page gutter */
    gutter: isMobile ? 16 : isTablet ? 24 : 32,
    /** Pick a value for the current breakpoint */
    select<T>(values: { mobile: T; tablet?: T; desktop?: T }): T {
      if (isDesktop) return values.desktop ?? values.tablet ?? values.mobile;
      if (isTablet) return values.tablet ?? values.mobile;
      return values.mobile;
    },
  };
}
