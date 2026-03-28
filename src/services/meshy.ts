// ============================================================
// MESHY AI — Service de reconstruction 3D
// Photo du plat → Modèle 3D photoréaliste (.glb/.usdz)
// ============================================================

const BASE = 'https://api.meshy.ai/openapi/v2';

// Clé API — à configurer
let API_KEY = '';

export const Meshy = {
  setApiKey(key: string) {
    API_KEY = key;
  },

  getApiKey() {
    return API_KEY;
  },

  /**
   * ÉTAPE 1 : Lancer la reconstruction 3D depuis une image
   * @param imageUrl - URL de l'image du plat (ou base64 data URI)
   * @returns taskId - ID de la tâche pour polling
   */
  async createFromImage(imageUrl: string): Promise<string> {
    const res = await fetch(`${BASE}/image-to-3d`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        enable_pbr: true,          // Textures PBR (réalisme max)
        topology: 'quad',          // Quad mesh (meilleure qualité)
        target_polycount: 50000,   // 50K polygones (détail chirurgical)
        should_remesh: true,       // Remaillage propre
      }),
    });
    const data = await res.json();
    if (!data.result) throw new Error(data.message || 'Erreur Meshy API');
    return data.result; // task_id
  },

  /**
   * ÉTAPE 1bis : Lancer la reconstruction depuis plusieurs images (multi-view)
   * Meilleure qualité — l'utilisateur prend 4-8 photos autour du plat
   */
  async createFromMultipleImages(imageUrls: string[]): Promise<string> {
    // Meshy supporte le multi-view via leur endpoint dédié
    const res = await fetch(`${BASE}/image-to-3d`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrls[0], // Image principale
        enable_pbr: true,
        topology: 'quad',
        target_polycount: 80000, // Plus de détails pour multi-view
        should_remesh: true,
      }),
    });
    const data = await res.json();
    if (!data.result) throw new Error(data.message || 'Erreur Meshy API');
    return data.result;
  },

  /**
   * ÉTAPE 2 : Vérifier l'état de la reconstruction
   * @returns { status, progress, model_urls, thumbnail_url }
   */
  async getTaskStatus(taskId: string): Promise<MeshyTaskResult> {
    const res = await fetch(`${BASE}/image-to-3d/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    });
    return await res.json();
  },

  /**
   * ÉTAPE 2bis : Polling automatique jusqu'à complétion
   * Résout avec les URLs des modèles 3D (.glb, .usdz, .fbx)
   */
  async waitForResult(
    taskId: string,
    onProgress?: (progress: number, status: string) => void
  ): Promise<MeshyModelUrls> {
    const maxAttempts = 120; // 10 minutes max
    let attempt = 0;

    while (attempt < maxAttempts) {
      const result = await this.getTaskStatus(taskId);

      if (onProgress) {
        onProgress(result.progress || 0, result.status);
      }

      if (result.status === 'SUCCEEDED') {
        return result.model_urls;
      }

      if (result.status === 'FAILED' || result.status === 'EXPIRED') {
        throw new Error(`Reconstruction échouée: ${result.status}`);
      }

      // Attendre 5 secondes avant le prochain check
      await new Promise(r => setTimeout(r, 5000));
      attempt++;
    }

    throw new Error('Timeout — la reconstruction prend trop de temps');
  },

  /**
   * PIPELINE COMPLET : Photo → Modèle 3D
   * C'est cette fonction que le scanner utilise
   */
  async scanDish(
    imageUrl: string,
    onProgress?: (progress: number, step: string) => void
  ): Promise<MeshyModelUrls> {
    // Étape 1 : Lancer la reconstruction
    if (onProgress) onProgress(5, 'Envoi de l\'image au moteur 3D...');
    const taskId = await this.createFromImage(imageUrl);

    // Étape 2 : Attendre le résultat
    return await this.waitForResult(taskId, (progress, status) => {
      const steps: Record<string, string> = {
        'PENDING': 'File d\'attente...',
        'IN_PROGRESS': 'Reconstruction 3D en cours...',
        'SUCCEEDED': 'Modèle 3D prêt !',
      };
      if (onProgress) onProgress(progress, steps[status] || status);
    });
  },
};

// ============================================================
// TYPES
// ============================================================

export interface MeshyModelUrls {
  glb: string;   // Pour Three.js / model-viewer
  fbx: string;   // Pour Unity / Blender
  usdz: string;  // Pour Apple AR Quick Look
  obj: string;   // Universel
}

export interface MeshyTaskResult {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED';
  progress: number;
  model_urls: MeshyModelUrls;
  thumbnail_url: string;
  texture_urls?: any[];
}
