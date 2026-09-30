import {
  PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BackendProvider } from '@profecian/shared';
import { colors, ThemeProvider, useTheme } from '@profecian/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { backend } from '@/backend';

const Loading = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
    <ActivityIndicator color={colors.primary} />
  </View>
);

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
    ...Ionicons.font,
  });
  if (!loaded && !error) return <Loading />;
  return (
    <SafeAreaProvider>
      <BackendProvider backend={backend} fallback={<Loading />}>
        <ThemeProvider storage={AsyncStorage} storageKey="@profecian/admin/theme/v1" fallback={<Loading />}>
          <ThemedStatusBar />
          <Slot />
        </ThemeProvider>
      </BackendProvider>
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}
