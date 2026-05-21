import AsyncStorage from '@react-native-async-storage/async-storage';
import {NavApp} from './navApps';

const KEY = '@rotas_sem_limites:settings';

export interface AppSettings {
  navApp: NavApp;
}

const DEFAULTS: AppSettings = {navApp: 'ask'};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return json ? {...DEFAULTS, ...JSON.parse(json)} : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export async function saveSettings(s: AppSettings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}
