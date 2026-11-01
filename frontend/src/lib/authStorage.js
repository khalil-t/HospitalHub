export const AUTH_STORAGE_KEYS = Object.freeze({
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
});

const getStorage = (type) => {
  if (typeof window === 'undefined') return null;
  return type === 'session' ? window.sessionStorage : window.localStorage;
};

const read = (type, key) => getStorage(type)?.getItem(key) ?? null;

const write = (type, key, value) => {
  const storage = getStorage(type);
  if (storage && value !== null && value !== undefined) {
    storage.setItem(key, value);
  }
};

const remove = (type, key) => {
  getStorage(type)?.removeItem(key);
};

export const isAuthStorageKey = (key) =>
  Object.values(AUTH_STORAGE_KEYS).includes(key);

export const authStorage = {
  getAccessToken() {
    return read('local', AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  },

  getRefreshToken() {
    return read('session', AUTH_STORAGE_KEYS.REFRESH_TOKEN);
  },

  getUser() {
    try {
      const stored = read('local', AUTH_STORAGE_KEYS.USER);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  setSession({ accessToken, refreshToken, user }) {
    write('local', AUTH_STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    write('session', AUTH_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    remove('local', AUTH_STORAGE_KEYS.REFRESH_TOKEN);
    write('local', AUTH_STORAGE_KEYS.USER, JSON.stringify(user));
  },

  setUser(user) {
    write('local', AUTH_STORAGE_KEYS.USER, JSON.stringify(user));
  },

  clearRefreshToken() {
    remove('session', AUTH_STORAGE_KEYS.REFRESH_TOKEN);
  },

  clearSession() {
    Object.values(AUTH_STORAGE_KEYS).forEach((key) => {
      remove('local', key);
      remove('session', key);
    });
  },
};
