import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';
import { bookingProblemLabel, formatDate, useDb } from '@profecian/shared';
import { Stars } from '@profecian/ui';
import { colors, createStyles, fonts, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';

const PREVIEW_COUNT = 3;

/** "Priya Sharma" → "Priya S." — reviews show a first name and initial only. */
function shortName(name: string): string {
  const [first, last] = name.trim().split(/\s+/);
  return last ? `${first} ${last[0]}.` : first ?? 'Customer';
}

/** Published customer reviews for one service: rating summary, breakdown and the latest reviews. */
export function ServiceReviews({ serviceId }: { serviceId: string }) {
  const db = useDb();
  const [showAll, setShowAll] = useState(false);
  const reviews = db.reviews
    .filter((r) => r.categoryId === serviceId && r.status === 'published')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (!reviews.length) {
    return (
      <View style={styles.card}>
        <AppText variant="h3">Customer reviews</AppText>
        <AppText variant="small">No reviews yet — be the first to book and rate this service.</AppText>
      </View>
    );
  }

  const average = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const counts = [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((r) => r.rating === star).length }));
  const shown = showAll ? reviews : reviews.slice(0, PREVIEW_COUNT);

  return (
    <View style={styles.card}>
      <AppText variant="h3">Customer reviews</AppText>

      <View style={styles.summary}>
        <View style={styles.score}>
          <AppText style={styles.average}>{average.toFixed(1)}</AppText>
          <Stars value={average} size={16} />
          <AppText variant="small">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</AppText>
        </View>
        <View style={styles.bars} accessibilityLabel="Rating breakdown">
          {counts.map(({ star, count }) => (
            <View key={star} style={styles.barRow} accessibilityLabel={`${star} stars: ${count}`}>
              <AppText style={styles.barLabel}>{star}★</AppText>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(count / reviews.length) * 100}%` }]} />
              </View>
              <AppText style={styles.barCount}>{count}</AppText>
            </View>
          ))}
        </View>
      </View>

      {shown.map((r) => {
        const booking = db.bookings.find((b) => b.id === r.bookingId);
        return (
          <View key={r.id} style={styles.review}>
            <View style={styles.reviewHead}>
              <View style={styles.avatar}>
                <AppText style={styles.avatarText}>{r.customerName.trim()[0]?.toUpperCase() ?? 'C'}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="label">{shortName(r.customerName)}</AppText>
                <AppText variant="tiny">
                  {formatDate(r.createdAt.slice(0, 10))}
                  {booking ? ` · ${bookingProblemLabel(db, booking)}` : ''}
                </AppText>
              </View>
              <Stars value={r.rating} size={13} />
            </View>
            {r.text ? <AppText variant="body">{r.text}</AppText> : null}
            {r.images.length ? (
              <View style={styles.photos}>
                {r.images.map((u) => (
                  <Image key={u} source={u} style={styles.photo} contentFit="cover" />
                ))}
              </View>
            ) : null}
          </View>
        );
      })}

      {reviews.length > PREVIEW_COUNT ? (
        <Button
          label={showAll ? 'Show fewer reviews' : `Show all ${reviews.length} reviews`}
          variant="outline"
          size="sm"
          icon={showAll ? 'chevron-up' : 'chevron-down'}
          onPress={() => setShowAll((v) => !v)}
        />
      ) : null}
    </View>
  );
}

const styles = createStyles(() => ({
  card: {
    marginTop: spacing.xxxl,
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl, flexWrap: 'wrap' },
  score: { alignItems: 'center', gap: 4, minWidth: 100 },
  average: { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 46, color: colors.ink },
  bars: { flex: 1, minWidth: 180, gap: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { width: 26, fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.background, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.star },
  barCount: { width: 24, textAlign: 'right', fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  review: { gap: spacing.sm, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bold, fontSize: 15, color: colors.primary },
  photos: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  photo: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.background },
}));
