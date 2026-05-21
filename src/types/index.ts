export interface Stop {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface Route {
  id: string;
  name: string;
  stops: Stop[];
  createdAt: number;
  updatedAt: number;
}

export interface SearchResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}
