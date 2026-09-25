export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface BookingInput {
  serviceId: string;
  issueId: string;
  name: string;
  address: string;
  landmark?: string;
  phone: string;
  /** ISO date, yyyy-mm-dd */
  date: string;
  /** Slot label, e.g. "10:00 AM" */
  time: string;
}

export interface Booking extends BookingInput {
  id: string;
  status: BookingStatus;
  price: number;
  createdAt: string;
}

/** react-native-web adds `hovered` to the Pressable state; RN's types don't include it. */
export type WebPressableState = import('react-native').PressableStateCallbackType & { hovered?: boolean };
