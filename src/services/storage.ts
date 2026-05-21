import AsyncStorage from '@react-native-async-storage/async-storage';
import {Route} from '../types';

const ROUTES_KEY = '@rotas_sem_limites:routes';

export async function loadRoutes(): Promise<Route[]> {
  try {
    const json = await AsyncStorage.getItem(ROUTES_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveRoutes(routes: Route[]): Promise<void> {
  await AsyncStorage.setItem(ROUTES_KEY, JSON.stringify(routes));
}

export async function saveRoute(route: Route): Promise<void> {
  const routes = await loadRoutes();
  const index = routes.findIndex(r => r.id === route.id);
  if (index >= 0) {
    routes[index] = route;
  } else {
    routes.unshift(route);
  }
  await saveRoutes(routes);
}

export async function deleteRoute(id: string): Promise<void> {
  const routes = await loadRoutes();
  await saveRoutes(routes.filter(r => r.id !== id));
}
