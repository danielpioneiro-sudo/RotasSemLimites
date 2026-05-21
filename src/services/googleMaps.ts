import {Linking, Alert} from 'react-native';
import {Stop} from '../types';

function coordStr(s: Stop) {
  return `${s.latitude},${s.longitude}`;
}

export function openInGoogleMaps(stops: Stop[]): void {
  if (stops.length === 0) return;

  // Formato /maps/dir/ funciona no app e na web
  const allPoints = stops.map(s => coordStr(s)).join('/');
  const webUrl = `https://www.google.com/maps/dir/${allPoints}`;

  // URL scheme do app Google Maps (só funciona se instalado)
  const origin = coordStr(stops[0]);
  const dest = coordStr(stops[stops.length - 1]);
  const middle = stops.slice(1, -1);
  const waypoints = middle.map(s => coordStr(s)).join('|');
  const appUrl =
    `comgooglemaps://?saddr=${origin}&daddr=${dest}` +
    (waypoints ? `&waypoints=${waypoints}` : '') +
    '&directionsmode=driving';

  Linking.canOpenURL(appUrl)
    .then(canOpen => Linking.openURL(canOpen ? appUrl : webUrl))
    .catch(() =>
      Alert.alert('Erro', 'Não foi possível abrir o Google Maps.'),
    );
}
