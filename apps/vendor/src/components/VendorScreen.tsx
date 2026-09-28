import Head from 'expo-router/head';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, colors, IconButton, spacing } from '@profecian/ui';

/** Mobile page shell: title bar (optional back + right action), scrollable body, optional sticky footer. */
export function VendorScreen({ title, subtitle, back, right, children, footer, scroll = true }: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const body = <View style={styles.body}>{children}</View>;
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Head><title>{`${title} | Profecian Partner`}</title></Head>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        {back ? <IconButton icon="arrow-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} /> : null}
        <View style={{ flex: 1 }}>
          <AppText variant="h2" numberOfLines={1}>{title}</AppText>
          {subtitle ? <AppText variant="small" numberOfLines={1}>{subtitle}</AppText> : null}
        </View>
        {right}
      </View>
      {scroll ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: footer ? spacing.lg : insets.bottom + spacing.xl }} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : body}
      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  body: { padding: spacing.lg, gap: spacing.lg, width: '100%', maxWidth: 720, alignSelf: 'center' },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
});
