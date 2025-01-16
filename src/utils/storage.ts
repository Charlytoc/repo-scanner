export const StorageManager = {
  get: (key: string) => {
    const item = localStorage.getItem(key);
    if (!item) return null;
    return JSON.parse(item);
  },
  set: (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove: (key: string) => {
    localStorage.removeItem(key);
  },
  clear: () => {
    localStorage.clear();
  },
};
