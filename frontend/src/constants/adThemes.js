import Store from 'lucide-react/dist/esm/icons/store.js';
import Scissors from 'lucide-react/dist/esm/icons/scissors.js';
import Laptop from 'lucide-react/dist/esm/icons/laptop.js';
import Pill from 'lucide-react/dist/esm/icons/pill.js';
import Shirt from 'lucide-react/dist/esm/icons/shirt.js';
import Wrench from 'lucide-react/dist/esm/icons/wrench.js';
import Car from 'lucide-react/dist/esm/icons/car.js';
import BookOpen from 'lucide-react/dist/esm/icons/book-open.js';
import Coffee from 'lucide-react/dist/esm/icons/coffee.js';
import Pizza from 'lucide-react/dist/esm/icons/pizza.js';
import Heart from 'lucide-react/dist/esm/icons/heart.js';
import Home from 'lucide-react/dist/esm/icons/home.js';

export const THEMES = {
  green: { bg: 'linear-gradient(110deg,#0c2a1a,#0f2e1c)', accent: '#5dcaa5' },
  blue: { bg: 'linear-gradient(110deg,#0a1e38,#0d2040)', accent: '#60a5fa' },
  purple: { bg: 'linear-gradient(110deg,#1e1228,#1a1030)', accent: '#c084fc' },
  orange: { bg: 'linear-gradient(110deg,#2a1500,#1f1200)', accent: '#fb923c' },
  red: { bg: 'linear-gradient(110deg,#0a0a0a,#1f0808)', accent: '#f87171' },
  teal: { bg: 'linear-gradient(110deg,#0a2020,#081818)', accent: '#2dd4bf' },
  amber: { bg: 'linear-gradient(110deg,#2a1a00,#1f1400)', accent: '#fbbf24' },
  pink: { bg: 'linear-gradient(110deg,#0a1a1e,#1f0818)', accent: '#f472b6' },
};

export const ICONS = [
  { key: 'store', label: 'Store', icon: Store },
  { key: 'scissors', label: 'Salon', icon: Scissors },
  { key: 'device-laptop', label: 'Electronics', icon: Laptop },
  { key: 'pill', label: 'Medical', icon: Pill },
  { key: 'shirt', label: 'Clothing', icon: Shirt },
  { key: 'tools', label: 'Hardware', icon: Wrench },
  { key: 'car', label: 'Auto', icon: Car },
  { key: 'book', label: 'Education', icon: BookOpen },
  { key: 'coffee', label: 'Cafe', icon: Coffee },
  { key: 'pizza', label: 'Food', icon: Pizza },
  { key: 'heart', label: 'Wellness', icon: Heart },
  { key: 'home', label: 'Home', icon: Home },
];

export function getIconEmoji(key) {
  return {
    store: '🏪', scissors: '✂️', 'device-laptop': '💻', pill: '💊',
    shirt: '👕', tools: '🛠️', car: '🚗', book: '📚',
    coffee: '☕', pizza: '🍕', heart: '❤️', home: '🏠'
  }[key] || '🏪';
}

export function matchThemeKey(bg) {
  if (!bg) return 'green';
  const found = Object.keys(THEMES).find(k => THEMES[k].bg === bg);
  return found || 'green';
}
