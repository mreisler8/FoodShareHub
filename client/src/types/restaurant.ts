export interface Restaurant {
  id: string;
  name: string;
  location: string;
  cuisine?: string;
  rating?: number;
  source: 'database' | 'google';
  priceLevel?: number;
  isOpen?: boolean;
}