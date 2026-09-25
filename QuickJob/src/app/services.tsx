import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Container } from '@/components/Container';
import { EmptyState } from '@/components/EmptyState';
import { FadeIn } from '@/components/FadeIn';
import { Grid } from '@/components/Grid';
import { Screen } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { ServiceCard } from '@/components/ServiceCard';
import { TrustBadges } from '@/components/TrustBadges';
import { searchServices } from '@/data/services';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing } from '@/theme';

export default function ServicesScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(params.q ?? '');
  const { isMobile, select } = useResponsive();

  // Keep the search box in sync when navigated to with a new ?q= (e.g. from the hero search).
  const [prevParam, setPrevParam] = useState(params.q);
  if (params.q !== prevParam) {
    setPrevParam(params.q);
    setQuery(params.q ?? '');
  }

  const results = useMemo(() => searchServices(query), [query]);

  return (
    <Screen pageTitle="All Services">
      <View style={styles.header}>
        <Container style={{ gap: spacing.md }}>
          <FadeIn style={{ gap: spacing.sm }}>
            <AppText variant={isMobile ? 'h1' : 'display'} accessibilityRole="header">
              All services
            </AppText>
            <AppText variant="body" color={colors.muted}>
              Trusted professionals for every job around your home.
            </AppText>
          </FadeIn>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search services or problems…" style={styles.search} />
          <TrustBadges />
        </Container>
      </View>

      <Container style={styles.body}>
        <AppText variant="small" style={{ marginBottom: spacing.lg }}>
          {query.trim()
            ? `${results.length} ${results.length === 1 ? 'result' : 'results'} for “${query.trim()}”`
            : `${results.length} services available`}
        </AppText>
        {results.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No services found"
            message="Try a different keyword like “AC”, “leak” or “cleaning”, or talk to us on WhatsApp."
            actionLabel="Clear search"
            onAction={() => {
              setQuery('');
              router.setParams({ q: '' });
            }}
          />
        ) : (
          <Grid columns={select({ mobile: 2, tablet: 3, desktop: 4 })} gap={isMobile ? 12 : 20}>
            {results.map((s, i) => (
              <FadeIn key={s.id} delay={60 * i}>
                <ServiceCard service={s} compact={isMobile} />
              </FadeIn>
            ))}
          </Grid>
        )}
      </Container>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  search: { maxWidth: 640, marginTop: spacing.sm },
  body: { paddingTop: spacing.xxl },
});
