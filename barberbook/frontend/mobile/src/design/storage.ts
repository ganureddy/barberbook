/**
 * Tiny key-value wrapper. Prefers MMKV (synchronous, native-fast) but
 * gracefully falls back to an in-memory Map when the native module isn't
 * installed — i.e. when running in Expo Go without a development build.
 *
 * `react-native-mmkv` v3 is built on Nitro Modules, so even importing it
 * throws on Expo Go. The try/catch here is around `require` for that exact
 * reason; static `import` would crash the bundle at module-eval time.
 */

interface KVStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
  readonly persistent: boolean;
}

function makeMemoryStore(): KVStore {
  const m = new Map<string, string>();
  return {
    persistent: false,
    getString: (k) => m.get(k),
    set: (k, v) => {
      m.set(k, v);
    },
    delete: (k) => {
      m.delete(k);
    },
  };
}

function makeStore(): KVStore {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-mmkv') as typeof import('react-native-mmkv');
    const mmkv = new mod.MMKV({ id: 'barberbook' });
    return {
      persistent: true,
      getString: (k) => mmkv.getString(k),
      set: (k, v) => {
        mmkv.set(k, v);
      },
      delete: (k) => {
        mmkv.delete(k);
      },
    };
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[barberbook] MMKV native module unavailable (likely Expo Go); ' +
          'preferences will not persist across app reloads.',
        err,
      );
    }
    return makeMemoryStore();
  }
}

export const kv: KVStore = makeStore();
