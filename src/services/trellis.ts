// ============================================================
// TRELLIS 3D — Reconstruction 3D gratuite via Microsoft TRELLIS
// Hugging Face Spaces (Gradio API) — AUCUNE clé API requise
// Photo du plat → Modèle 3D GLB
// ============================================================

const SPACE_URL = 'https://microsoft-trellis-2.hf.space';

interface TrellisResult {
  glbUrl: string;
  previewUrl: string;
}

export const Trellis = {

  /**
   * Convertir une image en modèle 3D GLB via TRELLIS
   * @param imageFile - Blob/File de l'image ou URL base64
   * @param onProgress - Callback de progression
   * @returns URL du fichier GLB téléchargeable
   */
  async imageToGlb(
    imageFile: Blob | string,
    onProgress?: (progress: number, step: string) => void
  ): Promise<TrellisResult> {

    onProgress?.(5, 'Connexion au serveur TRELLIS...');

    // ÉTAPE 1 — Démarrer une session
    const sessionHash = Math.random().toString(36).substring(2, 15);

    // ÉTAPE 2 — Upload de l'image
    onProgress?.(10, 'Upload de l\'image...');

    let imageData: any;
    if (typeof imageFile === 'string') {
      // C'est une URI locale (file://) ou base64 — on fetch d'abord
      const response = await fetch(imageFile);
      const blob = await response.blob();
      imageData = await this._uploadFile(blob, sessionHash);
    } else {
      imageData = await this._uploadFile(imageFile, sessionHash);
    }

    onProgress?.(15, 'Prétraitement de l\'image...');

    // ÉTAPE 3 — Preprocess image
    const preprocessResult = await this._callApi('preprocess_image', [
      imageData, // image
    ], sessionHash);

    onProgress?.(20, 'Lancement de la reconstruction 3D...');

    // ÉTAPE 4 — Image to 3D (le gros du travail)
    const result3d = await this._callApiWithProgress('image_to_3d', [
      preprocessResult?.data?.[0] ?? imageData, // image preprocessed
      0,       // seed
      '1024',  // resolution
      7.5,     // ss guidance strength
      0.7,     // ss guidance rescale
      12,      // ss sampling steps
      5.0,     // ss rescale t
      7.5,     // slat guidance strength
      0.5,     // slat guidance rescale
      12,      // slat sampling steps
      3.0,     // slat rescale t
      1.0,     // flow guidance strength
      0.0,     // flow guidance rescale
      12,      // flow sampling steps
      3.0,     // flow rescale t
    ], sessionHash, (p) => {
      const progress = 20 + Math.round(p * 50);
      onProgress?.(progress, 'Reconstruction 3D en cours...');
    });

    onProgress?.(75, 'Extraction du modèle GLB...');

    // ÉTAPE 5 — Extract GLB
    const stateData = result3d?.data?.[0]; // state from image_to_3d
    const glbResult = await this._callApi('extract_glb', [
      stateData,  // state
      300000,     // decimation target (polygones)
      2048,       // texture size
    ], sessionHash);

    onProgress?.(90, 'Finalisation...');

    // Récupérer l'URL du GLB
    const glbData = glbResult?.data?.[0]; // model3d component
    let glbUrl = '';

    if (glbData && typeof glbData === 'object' && glbData.url) {
      glbUrl = glbData.url.startsWith('http') ? glbData.url : `${SPACE_URL}/file=${glbData.url}`;
    } else if (glbData && typeof glbData === 'string') {
      glbUrl = glbData.startsWith('http') ? glbData : `${SPACE_URL}/file=${glbData}`;
    }

    onProgress?.(100, 'Modèle 3D prêt !');

    return {
      glbUrl,
      previewUrl: '',
    };
  },

  /**
   * Upload un fichier vers le Space Gradio
   */
  async _uploadFile(blob: Blob, sessionHash: string): Promise<any> {
    const formData = new FormData();
    formData.append('files', blob, 'photo.jpg');

    const res = await fetch(`${SPACE_URL}/upload?upload_id=${sessionHash}`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const files = await res.json();

    // Retourner au format Gradio image component
    return {
      path: files[0],
      url: `${SPACE_URL}/file=${files[0]}`,
      orig_name: 'photo.jpg',
      mime_type: 'image/jpeg',
    };
  },

  /**
   * Appel API Gradio standard (sans streaming)
   */
  async _callApi(apiName: string, data: any[], sessionHash: string): Promise<any> {
    const res = await fetch(`${SPACE_URL}/api/${apiName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data,
        session_hash: sessionHash,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${apiName} failed: ${res.status} - ${text}`);
    }

    return await res.json();
  },

  /**
   * Appel API Gradio avec polling de progression (pour les tâches longues)
   */
  async _callApiWithProgress(
    apiName: string,
    data: any[],
    sessionHash: string,
    onProgress?: (fraction: number) => void
  ): Promise<any> {
    // Lancer la tâche
    const joinRes = await fetch(`${SPACE_URL}/queue/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data,
        fn_index: this._getFnIndex(apiName),
        session_hash: sessionHash,
      }),
    });

    if (!joinRes.ok) {
      // Fallback: essayer l'appel direct
      return this._callApi(apiName, data, sessionHash);
    }

    // Polling via SSE
    const eventSource = `${SPACE_URL}/queue/data?session_hash=${sessionHash}`;

    return new Promise((resolve, reject) => {
      const es = new EventSource(eventSource);
      let resolved = false;

      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.msg === 'progress' && msg.progress_data) {
            const p = msg.progress_data[0];
            if (p && p.index !== undefined && p.length) {
              onProgress?.(p.index / p.length);
            }
          }

          if (msg.msg === 'process_completed') {
            resolved = true;
            es.close();
            resolve(msg.output);
          }

          if (msg.msg === 'process_error' || msg.msg === 'error') {
            es.close();
            reject(new Error(msg.error || 'TRELLIS processing error'));
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        if (!resolved) {
          es.close();
          // Fallback: essayer l'appel direct
          this._callApi(apiName, data, sessionHash).then(resolve).catch(reject);
        }
      };

      // Timeout 5 minutes
      setTimeout(() => {
        if (!resolved) {
          es.close();
          reject(new Error('TRELLIS timeout (5 min)'));
        }
      }, 300000);
    });
  },

  /**
   * Mapping api_name → fn_index
   */
  _getFnIndex(apiName: string): number {
    const map: Record<string, number> = {
      'start_session': 2,
      'preprocess_image': 4,
      'image_to_3d': 7,
      'extract_glb': 9,
    };
    return map[apiName] ?? 7;
  },
};
