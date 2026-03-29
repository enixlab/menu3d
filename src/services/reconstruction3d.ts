// ============================================================
// RECONSTRUCTION 3D — Via API serveur (frogleo/Image-to-3D)
// Photo → GLB en ~15 secondes, GRATUIT
// ============================================================

const API_URL = 'https://resolve-roller-ipaq-diana.trycloudflare.com';

export const Reconstruction3D = {

  async fromPhoto(
    photoUri: string,
    onProgress?: (progress: number, step: string) => void
  ): Promise<string> {
    onProgress?.(5, 'Preparation...');

    // 1. Convertir la photo en base64 et l'uploader
    onProgress?.(8, 'Upload de la photo...');
    let imageSource = photoUri;

    if (!photoUri.startsWith('http')) {
      // Photo locale (blob/file/data) → convertir en base64 et uploader
      try {
        const base64 = await this._toBase64(photoUri);
        const uploadRes = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });
        if (uploadRes.ok) {
          const { path } = await uploadRes.json();
          imageSource = path; // Le serveur utilisera le path local
        }
      } catch (e) {
        console.warn('Upload fallback to URL:', e);
      }
    }

    onProgress?.(12, 'Lancement reconstruction 3D...');

    // 2. Lancer la reconstruction
    const body: any = {};
    if (imageSource.startsWith('http')) {
      body.image_url = imageSource;
    } else {
      body.image_path = imageSource;
    }

    const res = await fetch(`${API_URL}/api/reconstruct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const { task_id } = await res.json();

    onProgress?.(15, 'Reconstruction en cours (~15s)...');

    // 3. Polling
    return this._poll(task_id, onProgress);
  },

  async _poll(
    taskId: string,
    onProgress?: (progress: number, step: string) => void
  ): Promise<string> {
    const start = Date.now();
    const maxWait = 120000;

    while (Date.now() - start < maxWait) {
      try {
        const res = await fetch(`${API_URL}/api/status/${taskId}`);
        if (!res.ok) throw new Error(`Poll failed: ${res.status}`);
        const data = await res.json();

        if (data.progress) {
          onProgress?.(data.progress, data.step || 'Reconstruction...');
        }

        if (data.status === 'done' && data.glb_url) {
          onProgress?.(100, 'Modele 3D pret !');
          return `${API_URL}${data.glb_url}`;
        }

        if (data.status === 'error') {
          throw new Error(data.error || 'Echec reconstruction');
        }
      } catch (e: any) {
        if (e.message?.includes('Echec')) throw e;
      }

      await new Promise(r => setTimeout(r, 2500));
    }

    throw new Error('Timeout 2 min');
  },

  async _toBase64(uri: string): Promise<string> {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },
};
