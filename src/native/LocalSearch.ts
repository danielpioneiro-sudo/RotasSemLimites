import {NativeModules} from 'react-native';
import {SearchResult} from '../types';

const {LocalSearchModule} = NativeModules;

export function searchLocations(query: string): Promise<SearchResult[]> {
  if (!LocalSearchModule) {
    return Promise.reject(new Error('LocalSearchModule não disponível'));
  }
  return LocalSearchModule.search(query);
}
