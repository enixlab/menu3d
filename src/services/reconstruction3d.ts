// ============================================================
// RECONSTRUCTION 3D — Via API serveur local + HuggingFace
// Photo → GLB en ~15 secondes
// ============================================================

// URL du serveur API (tunnel Cloudflare vers le serveur Python local)
const API_URL = 'https://resolve-roller-ipaq-diana.trycloudflare.com';

export const Reconstruction3D = {

  async fromPhoto(
    photoUri: string,
    onProgress?: (progress: number, step: string) => void
  ): Promise<string> {
    onProgress?.(5, 'Preparation de la photo...');

    // 1. Upload la photo vers un service d'hébergement temporaire
    //    On utilise l'URI directement si c'est une URL web
    let imageUrl = photoUri;

    // Si c'est un blob/fichier local, on l'upload d'abord
    if (photoUri.startsWith('blob:') || photoUri.startsWith('data:') || photoUri.startsWith('file:')) {
      onProgress?.(8, 'Upload de la photo...');
      imageUrl = await this._uploadToTmpHost(photoUri);
    }

    onProgress?.(10, 'Lancement de la reconstruction 3D...');

    // 2. Appeler notre API serveur
    const res = await fetch(`${API_URL}/api/reconstruct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl }),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const { task_id } = await res.json();

    onProgress?.(15, 'Reconstruction en cours...');

    // 3. Polling du statut
    const glbUrl = await this._pollStatus(task_id, onProgress);
    return glbUrl;
  },

  async _pollStatus(
    taskId: string,
    onProgress?: (progress: number, step: string) => void
  ): Promise<string> {
    const maxWait = 120000; // 2 minutes max
    const interval = 3000;  // poll toutes les 3s
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      const res = await fetch(`${API_URL}/api/status/${taskId}`);
      if (!res.ok) throw new Error(`Status check failed: ${res.status}`);

      const data = await res.json();

      if (data.progress) {
        onProgress?.(data.progress, data.step || 'Reconstruction...');
      }

      if (data.status === 'done' && data.glb_url) {
        onProgress?.(100, 'Modele 3D pret !');
        // Retourner l'URL complète du GLB
        return `${API_URL}${data.glb_url}`;
      }

      if (data.status === 'error') {
        throw new Error(data.error || 'Reconstruction failed');
      }

      // Attendre avant le prochain poll
      await new Promise(r => setTimeout(r, interval));
    }

    throw new Error('Reconstruction timeout (2 min)');
  },

  async _uploadToTmpHost(uri: string): Promise<string> {
    // Pour les blobs/fichiers locaux, on les convertit en base64
    // et on les envoie comme data URI (le serveur les gère)
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Utiliser une image Unsplash comme fallback pour le moment
          // TODO: implémenter un vrai upload vers un CDN
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      // Fallback: utiliser l'URI telle quelle
      return uri;
    }
  },
};
