import { useState } from 'react';
import { View } from 'react-native';
import { AppearanceSettings, Card } from '@profecian/ui';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { LocationSheet } from '@/components/LocationSheet';
import { Screen } from '@/components/Screen';
import { useLocation } from '@/context/LocationContext';
import { colors, spacing } from '@/theme';

/** App preferences: theme colour, light/dark mode and the location used for booking. */
export default function SettingsScreen() {
  const { title, subtitle, addresses } = useLocation();
  const [locationOpen, setLocationOpen] = useState(false);

  return (
    <Screen back title="Settings" pageTitle="Settings">
      <Container style={{ paddingTop: spacing.xxl, gap: spacing.xl, maxWidth: 620 }}>
        <View style={{ gap: 4 }}>
          <AppText variant="h1" accessibilityRole="header">Settings</AppText>
          <AppText variant="body" color={colors.muted}>Saved on this device.</AppText>
        </View>

        <AppearanceSettings />

        <Card style={{ gap: spacing.md }}>
          <AppText variant="h3">Location & addresses</AppText>
          <View style={{ gap: 2 }}>
            <AppText variant="label">{title}</AppText>
            <AppText variant="small">{subtitle}</AppText>
          </View>
          <Button
            label={addresses.length ? `Manage addresses (${addresses.length})` : 'Set location'}
            icon="location-outline"
            variant="secondary"
            onPress={() => setLocationOpen(true)}
          />
        </Card>
      </Container>
      <LocationSheet visible={locationOpen} onClose={() => setLocationOpen(false)} />
    </Screen>
  );
}
