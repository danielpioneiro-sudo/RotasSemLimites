import {Linking, ActionSheetIOS} from 'react-native';
import {Stop} from '../types';

export type NavApp = 'googlemaps' | 'waze' | 'applemaps' | 'ask';

export const NAV_APP_LABELS: Record<NavApp, string> = {
  googlemaps: 'Google Maps',
  waze: 'Waze',
  applemaps: 'Apple Maps',
  ask: 'Perguntar sempre',
};

type DirectApp = Exclude<NavApp, 'ask'>;

function buildUrls(stop: Stop, app: DirectApp): {appUrl: string; webUrl: string} {
  const {latitude: lat, longitude: lng} = stop;
  switch (app) {
    case 'waze':
      return {
        appUrl: `waze://?ll=${lat},${lng}&navigate=yes`,
        webUrl: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
      };
    case 'googlemaps':
      return {
        appUrl: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
        webUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
      };
    case 'applemaps':
      return {
        appUrl: `maps://?daddr=${lat},${lng}`,
        webUrl: `https://maps.apple.com/?daddr=${lat},${lng}`,
      };
  }
}

async function openDirect(stop: Stop, app: DirectApp): Promise<void> {
  const {appUrl, webUrl} = buildUrls(stop, app);
  const canOpen = await Linking.canOpenURL(appUrl).catch(() => false);
  Linking.openURL(canOpen ? appUrl : webUrl);
}

export function openStopInApp(stop: Stop, app: NavApp): Promise<void> {
  if (app !== 'ask') {
    return openDirect(stop, app);
  }
  return new Promise(resolve => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: stop.name,
        message: stop.address || undefined,
        options: ['Cancelar', 'Waze', 'Google Maps', 'Apple Maps'],
        cancelButtonIndex: 0,
      },
      buttonIndex => {
        const map: Record<number, DirectApp> = {
          1: 'waze',
          2: 'googlemaps',
          3: 'applemaps',
        };
        if (map[buttonIndex]) openDirect(stop, map[buttonIndex]);
        resolve();
      },
    );
  });
}
