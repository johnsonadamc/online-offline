export const CITIES = [
  'Atlanta', 'Austin', 'Boston', 'Chicago', 'Dallas', 'Denver',
  'Houston', 'Los Angeles', 'Miami', 'Nashville', 'New Orleans',
  'New York', 'Pensacola', 'Philadelphia', 'Phoenix', 'Portland',
  'San Antonio', 'San Diego', 'San Francisco', 'Seattle'
] as const;

export type City = typeof CITIES[number];
