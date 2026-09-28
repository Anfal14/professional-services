import { Image } from 'expo-image';
import { View } from 'react-native';
import { formatDateTime, useDb } from '@profecian/shared';
import { AppText, BarList, Card, colors, EmptyState, fonts, spacing, Stars } from '@profecian/ui';
import { useVendor } from '@/backend';
import { VendorScreen } from '@/components/VendorScreen';

export default function Reviews() {
  const vendor = useVendor()!;
  const db = useDb();
  const reviews = db.reviews.filter((r) => r.vendorId === vendor.id && r.status === 'published');
  const counts = [5, 4, 3, 2, 1].map((n) => ({ label: `${n} star`, value: reviews.filter((r) => r.rating === n).length }));

  return (
    <VendorScreen title="Ratings & reviews" back>
      <Card style={{ flexDirection: 'row', gap: spacing.xl, alignItems: 'center', flexWrap: 'wrap' }}>
        <View style={{ alignItems: 'center', gap: 4, minWidth: 110 }}>
          <AppText style={{ fontSize: 40, lineHeight: 46, fontFamily: fonts.extrabold, color: colors.ink }}>{vendor.rating || '—'}</AppText>
          <Stars value={vendor.rating} />
          <AppText variant="small">{reviews.length} reviews</AppText>
        </View>
        <View style={{ flex: 1, minWidth: 180 }}>
          <BarList data={counts} max={Math.max(1, reviews.length)} color={colors.star} />
        </View>
      </Card>
      {reviews.length === 0 ? <Card><EmptyState icon="star-outline" title="No reviews yet" message="Customers can rate you after each completed job." /></Card> : null}
      {reviews.map((r) => (
        <Card key={r.id} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Stars value={r.rating} />
            <AppText variant="small" style={{ flex: 1 }}>{r.customerName}</AppText>
            <AppText variant="tiny">{formatDateTime(r.createdAt)}</AppText>
          </View>
          <AppText>{r.text || 'No written feedback.'}</AppText>
          {r.images.length ? <View style={{ flexDirection: 'row', gap: 8 }}>{r.images.map((u) => <Image key={u} source={u} style={{ width: 64, height: 64, borderRadius: 8 }} />)}</View> : null}
        </Card>
      ))}
    </VendorScreen>
  );
}
