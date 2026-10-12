import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, Platform, View } from 'react-native';
import { AppText, type IconName } from './primitives';
import { colors, createStyles, fonts } from './theme';

const HEIGHT = 56;
const THUMB = 48;
const PAD = (HEIGHT - THUMB) / 2;
/** How far along the track the thumb must be dragged to confirm. */
const THRESHOLD = 0.85;

/**
 * A step that needs a deliberate gesture: drag the thumb to the end of the track to confirm. A tap
 * does nothing, so a phone in a pocket or a stray touch can't trigger it. Screen readers get an
 * "activate" action and, on the web, Enter or Space on the focused control confirms.
 */
export function SlideToConfirm({ label, onConfirm, disabled, loading, tone = 'primary', icon = 'chevron-forward', hint }: {
  label: string;
  onConfirm: () => void | Promise<unknown>;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'primary' | 'success';
  icon?: IconName;
  /** Shown instead of the label while disabled, to say what is missing. */
  hint?: string;
}) {
  const [x] = useState(() => new Animated.Value(0));
  const [width, setWidth] = useState(0);
  const max = Math.max(0, width - THUMB - PAD * 2);
  const track = useRef<View>(null);
  // How far the thumb can travel. Kept from layout and measured again when a drag starts, so the
  // gesture never depends on a layout event having arrived.
  const travel = useRef(0);
  const locked = !!disabled || !!loading;
  const color = tone === 'success' ? colors.success : colors.primary;
  const soft = tone === 'success' ? colors.successSoft : colors.primarySoft;

  // The gesture handlers are created once and read the latest props from here. Recreating them on
  // a re-render (the parent may re-render several times a second) would drop a drag in mid-swipe.
  const latest = useRef({ onConfirm, locked });
  useEffect(() => {
    latest.current = { onConfirm, locked };
  });

  const responder = useMemo(() => {
    const back = () => Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 6 }).start();
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.locked,
      onMoveShouldSetPanResponder: (_e, g) => !latest.current.locked && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => track.current?.measure((_x, _y, w) => {
        if (w > 0) travel.current = Math.max(0, w - THUMB - PAD * 2);
      }),
      onPanResponderMove: (_e, g) => x.setValue(Math.max(0, Math.min(travel.current, g.dx))),
      onPanResponderRelease: (_e, g) => {
        const end = travel.current;
        if (latest.current.locked || end <= 0 || g.dx < end * THRESHOLD) return back();
        // Confirm straight away — never wait on an animation, which may not run (app in the background).
        x.setValue(end);
        // Whatever happens next (success re-renders the screen, failure shows an error), the thumb returns.
        Promise.resolve(latest.current.onConfirm()).finally(back);
      },
      onPanResponderTerminate: back,
    });
  }, [x]);

  // Keyboard users can't drag: Enter or Space on the focused control confirms (web only).
  const web = Platform.OS === 'web'
    ? ({
        tabIndex: locked ? -1 : 0,
        onKeyDown: (e: { key: string; preventDefault: () => void }) => {
          if (locked || (e.key !== 'Enter' && e.key !== ' ')) return;
          e.preventDefault();
          void onConfirm();
        },
      } as object)
    : null;

  return (
    <View
      ref={track}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        travel.current = Math.max(0, w - THUMB - PAD * 2);
        setWidth(w);
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Slide to the right to confirm"
      accessibilityState={{ disabled: locked, busy: !!loading }}
      accessibilityActions={[{ name: 'activate', label }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'activate' && !locked) void onConfirm();
      }}
      style={[styles.track, { backgroundColor: soft, borderColor: disabled ? colors.border : color }, disabled && styles.disabled]}
      {...web}
    >
      {/* The filled part follows the thumb. */}
      <Animated.View style={[styles.fill, { backgroundColor: color, width: Animated.add(x, THUMB + PAD), opacity: x.interpolate({ inputRange: [0, Math.max(1, max)], outputRange: [0, 0.35] }) }]} />
      <AppText style={[styles.label, { color: disabled ? colors.muted : color }]} numberOfLines={1}>
        {disabled && hint ? hint : loading ? 'Please wait…' : label}
      </AppText>
      <Animated.View {...responder.panHandlers} style={[styles.thumb, { backgroundColor: disabled ? colors.muted : color, transform: [{ translateX: x }] }, Platform.OS === 'web' ? webThumb : null]}>
        {loading ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name={disabled ? 'lock-closed' : icon} size={22} color={colors.white} />}
      </Animated.View>
    </View>
  );
}

/** Keeps a mouse drag from selecting text or scrolling the page sideways. */
const webThumb = { cursor: 'grab', userSelect: 'none', touchAction: 'none' } as object;

const styles = createStyles(() => ({
  track: { height: HEIGHT, borderRadius: HEIGHT / 2, borderWidth: 1.5, justifyContent: 'center', overflow: 'hidden' },
  disabled: { opacity: 0.75 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: HEIGHT / 2 },
  label: { textAlign: 'center', fontFamily: fonts.bold, fontSize: 15, paddingLeft: THUMB + PAD * 2, paddingRight: PAD * 4 },
  thumb: { position: 'absolute', left: PAD, top: PAD - 1.5, width: THUMB, height: THUMB, borderRadius: THUMB / 2, alignItems: 'center', justifyContent: 'center' },
}));
