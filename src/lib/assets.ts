export function publicAsset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

export const APP_LOGO_SRC = publicAsset('app-logo.png');
