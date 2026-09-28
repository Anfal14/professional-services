import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BackendProvider } from '@profecian/shared';
import { backend } from '@/backend';
import { AuthProvider } from '@/context/AuthContext';
import { BookingsProvider } from '@/context/BookingsContext';
import { LocationProvider } from '@/context/LocationContext';
import { colors } from '@/theme';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    ...Ionicons.font,
  });

  const loading = (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );

  if (!loaded && !error) return loading;

  return (
    <SafeAreaProvider>
      <BackendProvider backend={backend} fallback={loading}>
        <AuthProvider>
          <LocationProvider>
            <BookingsProvider>
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                  contentStyle: { backgroundColor: colors.background },
                }}
              >
                <Stack.Screen name="index" options={{ animation: 'fade' }} />
                <Stack.Screen name="success" options={{ animation: 'fade', gestureEnabled: false }} />
                <Stack.Screen name="bookings" options={{ animation: 'fade' }} />
                <Stack.Screen name="account" options={{ animation: 'fade' }} />
                <Stack.Screen name="about" options={{ animation: 'fade' }} />
                <Stack.Screen name="contact" options={{ animation: 'fade' }} />
                <Stack.Screen name="login" options={{ animation: 'fade' }} />
                <Stack.Screen name="notifications" options={{ animation: 'fade' }} />
              </Stack>
            </BookingsProvider>
          </LocationProvider>
        </AuthProvider>
      </BackendProvider>
    </SafeAreaProvider>
  );
}
