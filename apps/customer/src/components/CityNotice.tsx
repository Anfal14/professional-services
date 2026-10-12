import { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Banner } from '@profecian/ui';
import { useLocation } from '@/context/LocationContext';
import { Button } from './Button';
import { LocationSheet } from './LocationSheet';

/**
 * Explains why the customer can't book here (city coming soon / paused / not served, or a service
 * this city doesn't offer) and lets them switch location. Renders nothing when booking is open.
 */
export function CityNotice({ reason, style }: { reason?: string | null; style?: StyleProp<ViewStyle> }) {
  const { blockedReason, liveCities } = useLocation();
  const [open, setOpen] = useState(false);
  const title = reason ?? blockedReason;
  if (!title) return null;
  const others = liveCities.map((c) => c.name).join(', ');
  // The city takes bookings, just not for this service.
  const message = !blockedReason ? 'Choose another service, or book for an address in another city.' : others ? `You can book in ${others}.` : undefined;

  return (
    <View style={style}>
      <Banner
        tone="warning"
        icon="location-outline"
        title={title}
        message={message}
        action={<Button label="Change location" size="sm" variant="secondary" icon="location-outline" onPress={() => setOpen(true)} />}
      />
      <LocationSheet visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}
