import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, Dish } from '../types';

const DEMO_MODEL = 'https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb';

// ============================================================
// LOCAL STORAGE SERVICE
// ============================================================

export const Storage = {
  async getClients(): Promise<Client[]> {
    try {
      const data = await AsyncStorage.getItem('clients');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveClients(clients: Client[]) {
    await AsyncStorage.setItem('clients', JSON.stringify(clients));
  },

  async getDishes(clientId: string): Promise<Dish[]> {
    try {
      const data = await AsyncStorage.getItem(`dishes_${clientId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveDishes(clientId: string, dishes: Dish[]) {
    await AsyncStorage.setItem(`dishes_${clientId}`, JSON.stringify(dishes));
  },

  async addDish(clientId: string, dish: Dish) {
    const dishes = await this.getDishes(clientId);
    dishes.push(dish);
    await this.saveDishes(clientId, dishes);
  },

  async seed() {
    const clients = await this.getClients();
    if (clients.length > 0) return;

    await this.saveClients([
      { id: 'belle', name: 'La Belle Assiette', sub: 'Cuisine française · Paris 8e', color: '#0047FF', logo: '', banner: '', status: 'live' },
      { id: 'sushi', name: 'Sushi Zen', sub: 'Restaurant japonais · Lyon', color: '#DC2626', logo: '', banner: '', status: 'live' },
      { id: 'marcel', name: 'Chez Marcel', sub: 'Brasserie traditionnelle · Bordeaux', color: '#059669', logo: '', banner: '', status: 'draft' },
    ]);

    await this.saveDishes('belle', [
      { id: 1, name: 'Pizza Truffe & Burrata', desc: 'Crème de truffe noire, mozzarella fior di latte, burrata crémeuse, roquette, parmesan 36 mois', price: 18.90, cat: 'pizzas', size: '⌀ 32cm', real: '32cm', img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&h=500&fit=crop', model: DEMO_MODEL, opts: [{ n: 'Truffe fraîche', p: 8 }, { n: 'Double burrata', p: 4 }], scans: 234, vertices: 48250 },
      { id: 2, name: 'Filet de Bœuf Rossini', desc: 'Filet Black Angus maturé 45j, foie gras, truffe noire, jus porto, grenaille', price: 42.90, cat: 'plats', size: '⌀ 28cm', real: '28cm', img: 'https://images.unsplash.com/photo-1558030006-450675393462?w=500&h=500&fit=crop', model: DEMO_MODEL, opts: [{ n: 'Double truffe', p: 12 }, { n: 'Purée truffée', p: 5 }], scans: 189, vertices: 52100 },
      { id: 3, name: 'Smash Burger Signature', desc: 'Double smash Black Angus, cheddar 18 mois, sauce secrète, pickles maison', price: 16.50, cat: 'burgers', size: '12×10cm', real: '12cm', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=500&fit=crop', model: DEMO_MODEL, opts: [{ n: 'Triple patty', p: 4 }, { n: 'Bacon fumé', p: 2.5 }], scans: 312, vertices: 41800 },
      { id: 4, name: 'Sphère Chocolat Valrhona', desc: 'Chocolat 70%, praliné noisette, glace vanille Madagascar, tuile dentelle', price: 14.90, cat: 'desserts', size: '⌀ 12cm', real: '12cm', img: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&h=500&fit=crop', model: DEMO_MODEL, opts: [{ n: 'Coulis passion', p: 2 }, { n: "Feuille d'or", p: 4 }], scans: 156, vertices: 38900 },
    ]);
  },
};
