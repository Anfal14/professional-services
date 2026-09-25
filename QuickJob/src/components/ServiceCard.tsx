import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type { Service } from '@/data/services';
import { colors, fonts, gradients, radius, shadows, spacing } from '@/theme';
import { formatPrice } from '@/utils/format';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { Rating } from './Rating';

interface ServiceCardProps {
  service: Service;
  compact?: boolean;
}

export function ServiceCard({ service, compact }: ServiceCardProps) {
  return (
    <PressableScale
      hoverLift
      onPress={() => router.push(`/service/${service.id}`)}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${service.name}, starting at ${formatPrice(service.startingPrice)}`}
    >
      <View style={[styles.imageWrap, { aspectRatio: compact ? 1.25 : 1.45 }]}>
        <Image source={service.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        <LinearGradient colors={gradients.card} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0.4 }} end={{ x: 0, y: 1 }} />
        <View style={[styles.iconChip, { backgroundColor: service.tint }]}>
          <Ionicons name={service.icon} size={18} color={colors.ink} />
        </View>
        {service.popular && (
          <View style={styles.popular}>
            <Ionicons name="flame" size={11} color={colors.white} />
            <AppText style={styles.popularText}>Popular</AppText>
          </View>
        )}
        <View style={styles.imageFooter}>
          <Rating value={service.rating} reviews={service.reviews} light />
        </View>
      </View>

      <View style={styles.body}>
        <AppText variant="h3" numberOfLines={1}>
          {service.name}
        </AppText>
        {!compact && (
          <AppText variant="small" numberOfLines={1}>
            {service.tagline}
          </AppText>
        )}
        <View style={styles.meta}>
          <AppText style={styles.price}>
            <AppText style={styles.from}>from </AppText>
            {formatPrice(service.startingPrice)}
          </AppText>
          <View style={styles.arrow}>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  imageWrap: { width: '100%', backgroundColor: colors.primarySoft, overflow: 'hidden' },
  iconChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popular: {
    position: 'absolute',
    top: 12,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  popularText: { fontFamily: fonts.bold, fontSize: 10.5, color: colors.white },
  imageFooter: { position: 'absolute', left: 12, bottom: 10 },
  body: { padding: spacing.md, paddingTop: spacing.md, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  price: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  from: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  arrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
