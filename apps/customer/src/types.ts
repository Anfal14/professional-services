export type { Booking, BookingStatus } from '@profecian/shared';

/** react-native-web adds `hovered` to the Pressable state; RN's types don't include it. */
export type WebPressableState = import('react-native').PressableStateCallbackType & { hovered?: boolean };

export type AuthProvider = 'manual' | 'google';

/** The signed-in customer as the UI needs it (see context/AuthContext.tsx). */
export interface AuthUser {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  city: string;
  provider: AuthProvider;
}

/** Details collected by the booking form (service + schedule come from the service screen). */
export interface BookingForm {
  issueId: string;
  name: string;
  phone: string;
  address: string;
  landmark?: string;
  /** ISO date, yyyy-mm-dd */
  date: string;
  /** Slot label, e.g. "10:00 AM" */
  time: string;
}
