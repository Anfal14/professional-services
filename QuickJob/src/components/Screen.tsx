import { forwardRef, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from 'react-native';
import Head from 'expo-router/head';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, shadows, spacing } from '@/theme';
import { BottomNav } from './BottomNav';
import { Container } from './Container';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

interface ScreenProps extends Pick<ScrollViewProps, 'keyboardShouldPersistTaps'> {
  children: ReactNode;
  back?: boolean;
  title?: string;
  /** Browser tab title (web) */
  pageTitle?: string;
  footer?: boolean;
  /** Mobile tab bar (hidden on tablet/desktop) */
  bottomNav?: boolean;
  /** Sticky action bar pinned to the bottom of the screen */
  actionBar?: ReactNode;
}

/**
 * Page shell: sticky navbar, scrollable content, footer,
 * and either a mobile tab bar or a sticky action bar.
 */
export const Screen = forwardRef<ScrollView, ScreenProps>(function Screen(
  { children, back, title, pageTitle, footer = true, bottomNav = true, actionBar, keyboardShouldPersistTaps = 'handled' },
  ref,
) {
  const insets = useSafeAreaInsets();
  const { isMobile } = useResponsive();
  const showTabs = bottomNav && isMobile && !actionBar;
  const needsInset = !showTabs && !actionBar;

  return (
    <View style={styles.root}>
      {pageTitle ? (
        <Head>
          <title>{`${pageTitle} | QuickJob`}</title>
        </Head>
      ) : null}
      <Navbar back={back} title={title} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={ref}
          style={styles.flex}
          contentContainerStyle={[styles.content, needsInset && { paddingBottom: insets.bottom }]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.flex}>{children}</View>
          {footer && <Footer />}
        </ScrollView>
        {actionBar ? (
          <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <Container>{actionBar}</Container>
          </View>
        ) : null}
      </KeyboardAvoidingView>
      {showTabs && <BottomNav />}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1 },
  actionBar: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    ...shadows.lg,
  },
});
