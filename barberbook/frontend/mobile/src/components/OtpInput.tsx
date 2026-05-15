import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '../design/ThemeProvider';
import { palette, radii, spacing } from '../design/tokens';
import { fontFamilies } from '../design/typography';

import { Text } from './Text';

export interface OtpInputProps {
  /** Number of digits. Default 6 — matches the backend OTP length. */
  length?: number;
  /** Current value. The component is fully controlled. */
  value: string;
  onChange: (next: string) => void;
  /** Fired when the user completes the last digit. */
  onComplete?: (value: string) => void;
  /**
   * If true, every ~750ms while focused the component peeks at the system
   * clipboard. If a fresh `length`-digit numeric string is found, it is
   * autofilled and `onComplete` fires. This is the iOS+Android-friendly
   * compromise — true Android SMS Retriever needs a custom dev client and
   * a server-side hash, which lives in a follow-up.
   */
  autofillFromClipboard?: boolean;
  errored?: boolean;
  disabled?: boolean;
}

export interface OtpInputHandle {
  focus: () => void;
  clear: () => void;
}

/**
 * Six-box OTP input. Renders one TextInput per cell with auto-advance on type
 * and back-erase on Backspace. The cells share a single hidden focus surface
 * so paste/autofill gestures land naturally — no per-cell focus juggling
 * required from the caller.
 */
export const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(function OtpInput(
  {
    length = 6,
    value,
    onChange,
    onComplete,
    autofillFromClipboard = true,
    errored = false,
    disabled = false,
  },
  ref,
) {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const { theme } = useTheme();
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const lastClipboardSeen = useRef<string>('');

  const focusFirstEmpty = useCallback(() => {
    const idx = Math.min(value.length, length - 1);
    inputRefs.current[idx]?.focus();
  }, [length, value.length]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      focusFirstEmpty();
    },
    clear: () => {
      onChange('');
    },
  }));

  // Fire onComplete when the value reaches full length.
  useEffect(() => {
    if (value.length === length) onComplete?.(value);
  }, [length, onComplete, value]);

  // Clipboard polling. Disabled when the field is full or unfocused.
  useEffect(() => {
    if (!autofillFromClipboard || disabled) return;
    if (value.length >= length) return;
    if (focusedIdx < 0) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const raw = await Clipboard.getStringAsync();
        if (cancelled) return;
        if (!raw || raw === lastClipboardSeen.current) return;
        lastClipboardSeen.current = raw;
        const digits = raw.replace(/\D/g, '');
        if (digits.length === length) {
          onChange(digits);
          Haptics.selectionAsync().catch(() => {});
          inputRefs.current[length - 1]?.focus();
        }
      } catch {
        // Some platforms return permission errors here; ignore.
      }
    };
    tick().catch(() => {});
    const id = setInterval(() => {
      tick().catch(() => {});
    }, 750);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [autofillFromClipboard, disabled, focusedIdx, length, onChange, value.length]);

  const cells = useMemo(() => Array.from({ length }, (_, i) => i), [length]);

  const handleCellChange = (idx: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 0) {
      // Caused by Backspace on an empty cell — handled in onKeyPress.
      return;
    }
    if (digits.length === length) {
      // Paste of the full code into a single cell — accept it whole.
      onChange(digits);
      Haptics.selectionAsync().catch(() => {});
      inputRefs.current[length - 1]?.focus();
      return;
    }
    // Single digit (or trimmed): replace cell idx, advance focus.
    const ch = digits.slice(-1);
    const next = value.padEnd(length, ' ').split('');
    next[idx] = ch;
    const merged = next.join('').replace(/\s+$/g, '');
    onChange(merged);
    if (idx < length - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (idx: number, key: string) => {
    if (key === 'Backspace') {
      if (value[idx] != null) {
        // Erase current cell.
        const next = value.split('');
        next[idx] = '';
        onChange(next.join('').slice(0, idx));
        return;
      }
      // Already empty — step back and erase previous.
      if (idx > 0) {
        const next = value
          .split('')
          .slice(0, idx - 1)
          .join('');
        onChange(next);
        inputRefs.current[idx - 1]?.focus();
      }
    }
  };

  const cellSize = 48;

  return (
    <Pressable onPress={focusFirstEmpty} accessibilityRole="text" style={styles.row}>
      {cells.map((i) => {
        const ch = value[i] ?? '';
        const focused =
          focusedIdx === i || (focusedIdx === -1 && i === Math.min(value.length, length - 1));
        const borderColor = errored
          ? palette.red
          : ch
            ? theme.text
            : focused
              ? theme.text
              : theme.lineStrong;

        return (
          <View
            key={i}
            style={[
              styles.cell,
              {
                width: cellSize,
                height: cellSize + 12,
                borderColor,
                backgroundColor: theme.surface,
              },
            ]}
          >
            <TextInput
              ref={(r) => {
                inputRefs.current[i] = r;
              }}
              {...COMMON_INPUT_PROPS}
              editable={!disabled}
              value={ch}
              onChangeText={(t) => {
                handleCellChange(i, t);
              }}
              onKeyPress={(e) => {
                handleKeyPress(i, e.nativeEvent.key);
              }}
              onFocus={() => {
                setFocusedIdx(i);
              }}
              onBlur={() => {
                setFocusedIdx((cur) => (cur === i ? -1 : cur));
              }}
              style={[styles.cellInput, { color: theme.text }]}
              caretHidden
              selectionColor={palette.red}
            />
            {!ch && focused && <Caret />}
          </View>
        );
      })}
    </Pressable>
  );
});

function Caret() {
  return (
    <View style={styles.caretWrap} pointerEvents="none">
      <Text variant="display" color={palette.red}>
        |
      </Text>
    </View>
  );
}

const COMMON_INPUT_PROPS = {
  keyboardType: 'number-pad',
  textContentType: 'oneTimeCode' as const,
  autoComplete: 'sms-otp' as const,
  maxLength: 6,
  // RN requires importantForAutofill to opt into Android oneTimeCode autofill
  importantForAutofill: 'yes' as const,
  returnKeyType: 'done' as const,
  blurOnSubmit: false,
} satisfies Partial<TextInputProps>;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cell: {
    borderWidth: 2,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontFamily: fontFamilies.monoBold,
    fontSize: 26,
    padding: 0,
  },
  caretWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
