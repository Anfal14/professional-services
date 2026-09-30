import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { TextInput, View } from 'react-native';
import { formatPhone, isValidPhone, TEST_OTP } from '@profecian/shared';
import { AppText, Banner, Button, TextField } from './primitives';
import { colors, fonts, radius, spacing, createStyles } from './theme';

interface OtpLoginProps {
  /** Heading shown on the phone step */
  title: string;
  subtitle: string;
  requestOtp: (phone: string) => Promise<{ requestId: string; resendInSec: number }>;
  verifyOtp: (requestId: string, code: string) => Promise<void>;
  /** Pre-filled number, e.g. a demo account */
  initialPhone?: string;
  footer?: ReactNode;
}

const CODE_LENGTH = 6;

/** Two-step mobile OTP login: enter number → enter 6-digit code (with resend timer). */
export function OtpLogin({ title, subtitle, requestOtp, verifyOtp, initialPhone = '', footer }: OtpLoginProps) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<TextInput>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const send = async () => {
    if (!isValidPhone(phone)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await requestOtp(phone);
      setRequestId(res.requestId);
      setResendIn(res.resendInSec);
      setCode('');
      setStep('code');
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send OTP');
    } finally {
      setPending(false);
    }
  };

  const verify = async (value = code) => {
    if (!requestId || value.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code`);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await verifyOtp(requestId, value);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
      setPending(false);
    }
  };

  if (step === 'phone') {
    return (
      <View style={styles.wrap}>
        <View style={{ gap: 6 }}>
          <AppText variant="h1">{title}</AppText>
          <AppText variant="body" color={colors.muted}>{subtitle}</AppText>
        </View>
        <TextField
          label="Mobile number"
          prefix="+91"
          placeholder="98765 43210"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={14}
          value={phone}
          onChangeText={(t) => { setPhone(t.replace(/[^\d\s]/g, '')); setError(null); }}
          onSubmitEditing={send}
          returnKeyType="next"
          error={error}
        />
        <Button label="Send OTP" icon="chatbubble-ellipses-outline" size="lg" fullWidth loading={pending} onPress={send} />
        {footer}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={{ gap: 6 }}>
        <AppText variant="h1">Verify your number</AppText>
        <AppText variant="body" color={colors.muted}>
          Enter the 6-digit code sent to <AppText style={{ fontFamily: fonts.bold, color: colors.ink }}>{formatPhone(phone)}</AppText>
        </AppText>
      </View>

      <View>
        <View style={styles.boxes} pointerEvents="none">
          {Array.from({ length: CODE_LENGTH }).map((_, i) => {
            const active = i === code.length;
            return (
              <View key={i} style={[styles.box, active && styles.boxActive, !!error && styles.boxError]}>
                <AppText style={styles.digit}>{code[i] ?? ''}</AppText>
              </View>
            );
          })}
        </View>
        {/* One real input under the boxes keeps paste, autofill and accessibility working. */}
        <TextInput
          ref={codeRef}
          value={code}
          onChangeText={(t) => {
            const digits = t.replace(/\D/g, '').slice(0, CODE_LENGTH);
            setCode(digits);
            setError(null);
            if (digits.length === CODE_LENGTH) verify(digits);
          }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={CODE_LENGTH}
          style={styles.hiddenInput}
          accessibilityLabel="One-time password"
          autoFocus
        />
      </View>

      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={15} color={colors.danger} />
          <AppText style={styles.error}>{error}</AppText>
        </View>
      ) : null}

      <Banner tone="info" icon="flask-outline" title={`Demo mode: use OTP ${TEST_OTP}`} message="SMS delivery is stubbed until an OTP provider is connected." />

      <Button label="Verify & continue" size="lg" fullWidth loading={pending} onPress={() => verify()} />

      <View style={styles.row}>
        <Button label="Change number" variant="ghost" size="sm" icon="arrow-back" onPress={() => { setStep('phone'); setError(null); }} />
        <Button label={resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'} variant="ghost" size="sm" disabled={resendIn > 0 || pending} onPress={send} />
      </View>
    </View>
  );
}

const styles = createStyles(() => ({
  wrap: { gap: spacing.xl, width: '100%', maxWidth: 440, alignSelf: 'center' },
  boxes: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  box: {
    flex: 1, maxWidth: 56, height: 58, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  boxActive: { borderColor: colors.primary, backgroundColor: colors.inputBg },
  boxError: { borderColor: colors.danger },
  digit: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.ink },
  hiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.01, color: 'transparent' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
}));
