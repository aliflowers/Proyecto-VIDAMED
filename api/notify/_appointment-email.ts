export function getPublicUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_PUBLIC_URL as string | undefined;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && (window as any).location?.origin) {
    return (window as any).location.origin;
  }
  return '';
}