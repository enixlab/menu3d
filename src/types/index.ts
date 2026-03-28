export interface Client {
  id: string;
  name: string;
  sub: string;
  color: string;
  logo: string;
  banner: string;
  status: 'live' | 'draft';
}

export interface DishOption {
  n: string;
  p: number;
}

export interface Dish {
  id: number;
  name: string;
  desc: string;
  price: number;
  cat: string;
  size: string;
  real: string;
  img: string;
  model: string;
  opts: DishOption[];
  scans: number;
  vertices: number;
}

export interface CartItem {
  name: string;
  img: string;
  extras: string[];
  total: number;
}

export interface ScanSector {
  index: number;
  points: number;
  done: boolean;
}

export interface ScanData {
  points: number[];
  colors: number[];
  features: number;
  frames: number;
  sectors: number[];
}
