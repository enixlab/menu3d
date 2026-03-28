// ============================================================
// MENU3D — Design System
// Fond BLANC, accent bleu #0047FF, luxe sans dorure
// ============================================================

export const COLORS = {
  // Backgrounds
  white: '#FFFFFF',
  bg: '#F8F9FC',
  bg2: '#F1F3F9',
  bg3: '#E8ECF4',
  surface: '#FFFFFF',
  surface2: '#F8F9FC',

  // Text
  text: '#0F172A',
  text2: '#475569',
  text3: '#94A3B8',
  text4: '#CBD5E1',

  // Brand
  brand: '#0047FF',
  brandHover: '#0039CC',
  brandLight: '#E8EEFF',
  brandSoft: '#F0F4FF',

  // Accents
  cyan: '#00C8FF',
  indigo: '#4F46E5',
  violet: '#7C3AED',

  // Status
  green: '#10B981',
  greenLight: '#ECFDF5',
  red: '#EF4444',
  redLight: '#FEF2F2',
  yellow: '#F59E0B',
  yellowLight: '#FFFBEB',

  // Borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  bold: 'System',
  mono: 'monospace',
};

export const SHADOWS = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
    elevation: 6,
  },
  brand: {
    shadowColor: '#0047FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 8,
  },
};

export const RADIUS = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const CATEGORIES = [
  { id: 'all', label: 'Tout', icon: '✦' },
  { id: 'entrees', label: 'Entrées', icon: '🥗' },
  { id: 'plats', label: 'Plats', icon: '🍽️' },
  { id: 'pizzas', label: 'Pizzas', icon: '🍕' },
  { id: 'burgers', label: 'Burgers', icon: '🍔' },
  { id: 'desserts', label: 'Desserts', icon: '🍰' },
  { id: 'boissons', label: 'Boissons', icon: '🥂' },
];
