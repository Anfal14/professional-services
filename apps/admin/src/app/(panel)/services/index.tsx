import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';
import { commissionRateIn, findCity, formatINR, isCategoryOfferedIn, problemPriceIn, useBackend, useDb } from '@profecian/shared';
import { AppText, asIcon, Badge, Button, Card, radius, spacing, Toggle, tintTile } from '@profecian/ui';
import { Page } from '@/components/admin';
import { useCityScope } from '@/components/cityScope';
import { CategorySheet } from '@/components/ServiceForms';

export default function Services() {
  const db = useDb();
  const backend = useBackend();
  const [creating, setCreating] = useState(false);
  // With a city selected, prices and commission are that city's.
  const { city } = useCityScope();
  const cityInfo = findCity(db.settings, city ?? undefined);
  const categories = [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Page
      title="Services"
      subtitle={cityInfo
        ? `Prices and commission as charged in ${cityInfo.name}${cityInfo.priceLevel === 100 ? ' (base prices)' : ` (${cityInfo.priceLevel}% of base)`}. Open a service to set exact prices for this city.`
        : 'Everything customers can book, at base prices. Pick a city to see its prices. Changes apply immediately in the customer app.'}
      permission="services"
      cityFilter
      actions={<Button label="Add category" icon="add" onPress={() => setCreating(true)} />}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
        {categories.map((c) => {
          const problems = db.problemTypes.filter((p) => p.categoryId === c.id);
          const enabled = problems.filter((p) => p.enabled);
          const from = enabled.length ? Math.min(...enabled.map((p) => problemPriceIn(p, cityInfo))) : 0;
          const bookings = db.bookings.filter((b) => b.categoryId === c.id && (!cityInfo || b.address.city.toLowerCase() === cityInfo.name.toLowerCase())).length;
          const rate = commissionRateIn(c, db.settings, cityInfo);
          const offered = !cityInfo || isCategoryOfferedIn(cityInfo, c.id);
          return (
            <Card key={c.id} padded={false} onPress={() => router.navigate(`/services/${c.id}`)} style={{ width: 300, flexGrow: 1, maxWidth: 420, overflow: 'hidden', opacity: c.enabled ? 1 : 0.7 }}>
              <View style={{ height: 110, backgroundColor: c.tint }}>
                {c.image ? <Image source={c.image} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                <View style={{ position: 'absolute', top: 10, left: 10, width: 36, height: 36, borderRadius: radius.md, backgroundColor: tintTile(c.tint).bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={asIcon(c.icon)} size={20} color={tintTile(c.tint).fg} />
                </View>
                <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', gap: 6 }}>
                  {c.popular ? <Badge label="Popular" tone="primary" /> : null}
                  {!offered ? <Badge label={`Not in ${cityInfo?.name}`} tone="warning" /> : null}
                  <Badge label={c.enabled ? 'Live' : 'Disabled'} tone={c.enabled ? 'success' : 'neutral'} />
                </View>
              </View>
              <View style={{ padding: spacing.lg, gap: 6 }}>
                <AppText variant="h3">{c.name}</AppText>
                <AppText variant="small" numberOfLines={1}>{c.tagline}</AppText>
                <AppText variant="small">
                  {enabled.length}/{problems.length} problem types · from {formatINR(from)} · {Math.round(rate * 1000) / 10}% commission{cityInfo?.commissionRate != null ? ' (city rate)' : ''} · {bookings} {bookings === 1 ? 'booking' : 'bookings'}
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                  <Toggle label={`${c.name} enabled`} value={c.enabled} onChange={(v) => backend.admin.saveCategory({ ...c, enabled: v })} />
                  <AppText variant="small">{c.enabled ? 'Visible to customers' : 'Hidden from customers'}</AppText>
                </View>
              </View>
            </Card>
          );
        })}
      </View>
      {creating ? <CategorySheet visible onClose={() => setCreating(false)} /> : null}
    </Page>
  );
}
