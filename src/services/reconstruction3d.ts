// ============================================================
// RECONSTRUCTION 3D — TripoSG (VAST-AI) via Hugging Face
// 100% GRATUIT — Aucune clé API — Image → GLB en ~60 secondes
// ============================================================

const TRIPOSG_URL = 'https://vast-ai-triposg.hf.space';
const TRELLIS_URL = 'https://trellis-community-trellis.hf.space';

export const Reconstruction3D = {

  /**
   * Pipeline complet : photo → modèle 3D GLB
   * Essaie TripoSG d'abord, fallback TRELLIS
   */
  async fromPhoto(
    photoUri: string,
    onProgress?: (progress: number, step: string) => void
  ): Promise<string> {
    // Essayer TripoSG
    try {
      onProgress?.(5, 'Connexion à TripoSG (VAST-AI)...');
      const glbUrl = await this._tripoSG(photoUri, onProgress);
      if (glbUrl) return glbUrl;
    } catch (e) {
      console.warn('TripoSG failed:', e);
    }

    // Fallback TRELLIS
    try {
      onProgress?.(5, 'Connexion à TRELLIS (Microsoft)...');
      const glbUrl = await this._trellis(photoUri, onProgress);
      if (glbUrl) return glbUrl;
    } catch (e) {
      console.warn('TRELLIS failed:', e);
    }

    throw new Error('Tous les services de reconstruction sont indisponibles');
  },

  // ============================================================
  // TRIPOSG — VAST-AI (rapide, ~60s)
  // ============================================================
  async _tripoSG(
    photoUri: string,
    onProgress?: (progress: number, step: string) => void
  ): Promise<string> {
    const sessionHash = 's_' + Math.random().toString(36).substring(2, 12);

    // 1. Upload image
    onProgress?.(8, 'Upload de la photo...');
    const imageData = await this._uploadFile(TRIPOSG_URL, photoUri, sessionHash);

    // 2. Segmentation (retirer le fond)
    onProgress?.(15, 'Segmentation de l\'objet...');
    const segResult = await this._gradioCall(TRIPOSG_URL, 'run_segmentation', [imageData], sessionHash);
    const segImage = segResult?.data?.[0] ?? imageData;

    // 3. Génération 3D
    onProgress?.(25, 'Génération du modèle 3D...');
    const glbResult = await this._gradioCallQueued(
      TRIPOSG_URL,
      'image_to_3d',
      [
        segImage,   // segmented image
        0,          // seed
        50,         // inference steps
        7.0,        // CFG scale
        true,       // simplify mesh
        100000,     // target faces
      ],
      sessionHash,
      4, // fn_index for image_to_3d
      (p) => {
        const progress = 25 + Math.round(p * 45);
        onProgress?.(progress, 'Reconstruction 3D en cours...');
      }
    );

    const meshData = glbResult?.data?.[0];

    // 4. Texturing
    onProgress?.(75, 'Application des textures...');
    const textureResult = await this._gradioCallQueued(
      TRIPOSG_URL,
      'run_texture',
      [
        imageData,  // original image
        meshData,   // mesh from step 3
        0,          // seed
      ],
      sessionHash,
      6, // fn_index for run_texture
      (p) => {
        const progress = 75 + Math.round(p * 20);
        onProgress?.(progress, 'Textures photoréalistes...');
      }
    );

    onProgress?.(98, 'Finalisation du modèle GLB...');

    const texturedGlb = textureResult?.data?.[0];
    return this._extractFileUrl(TRIPOSG_URL, texturedGlb) || this._extractFileUrl(TRIPOSG_URL, meshData) || '';
  },

  // ============================================================
  // TRELLIS — Microsoft (fallback)
  // ============================================================
  async _trellis(
    photoUri: string,
    onProgress?: (progress: number, step: string) => void
  ): Promise<string> {
    const sessionHash = 't_' + Math.random().toString(36).substring(2, 12);

    onProgress?.(8, 'Upload vers TRELLIS...');
    const imageData = await this._uploadFile(TRELLIS_URL, photoUri, sessionHash);

    onProgress?.(15, 'Prétraitement...');
    const prepResult = await this._gradioCall(TRELLIS_URL, 'preprocess_image', [imageData], sessionHash);
    const prepImage = prepResult?.data?.[0] ?? imageData;

    onProgress?.(25, 'Reconstruction 3D TRELLIS...');
    const result3d = await this._gradioCallQueued(
      TRELLIS_URL,
      'image_to_3d',
      [prepImage, 0, '1024', 7.5, 0.7, 12, 5.0, 7.5, 0.5, 12, 3.0, 1.0, 0.0, 12, 3.0],
      sessionHash,
      7,
      (p) => {
        const progress = 25 + Math.round(p * 40);
        onProgress?.(progress, 'Reconstruction en cours...');
      }
    );

    onProgress?.(70, 'Extraction GLB...');
    const stateData = result3d?.data?.[0];
    const glbResult = await this._gradioCall(TRELLIS_URL, 'extract_glb', [stateData, 300000, 2048], sessionHash);

    onProgress?.(98, 'Modèle prêt !');
    return this._extractFileUrl(TRELLIS_URL, glbResult?.data?.[0]) || '';
  },

  // ============================================================
  // UTILS
  // ============================================================
  async _uploadFile(baseUrl: string, uri: string, sessionHash: string): Promise<any> {
    const response = await fetch(uri);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append('files', blob, 'photo.jpg');

    const res = await fetch(`${baseUrl}/upload?upload_id=${sessionHash}`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const files = await res.json();

    return {
      path: files[0],
      url: `${baseUrl}/file=${files[0]}`,
      orig_name: 'photo.jpg',
      mime_type: 'image/jpeg',
    };
  },

  async _gradioCall(baseUrl: string, apiName: string, data: any[], sessionHash: string): Promise<any> {
    const res = await fetch(`${baseUrl}/api/${apiName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, session_hash: sessionHash }),
    });
    if (!res.ok) throw new Error(`${apiName}: ${res.status}`);
    return res.json();
  },

  async _gradioCallQueued(
    baseUrl: string,
    apiName: string,
    data: any[],
    sessionHash: string,
    fnIndex: number,
    onProgress?: (fraction: number) => void
  ): Promise<any> {
    // Join queue
    const joinRes = await fetch(`${baseUrl}/queue/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data,
        fn_index: fnIndex,
        session_hash: sessionHash,
      }),
    });

    if (!joinRes.ok) {
      // Fallback direct call
      return this._gradioCall(baseUrl, apiName, data, sessionHash);
    }

    // SSE polling
    return new Promise((resolve, reject) => {
      const es = new EventSource(`${baseUrl}/queue/data?session_hash=${sessionHash}`);
      let done = false;

      const timeout = setTimeout(() => {
        if (!done) { es.close(); reject(new Error('Timeout 5min')); }
      }, 300000);

      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.msg === 'progress' && msg.progress_data?.[0]) {
            const p = msg.progress_data[0];
            if (p.length) onProgress?.(p.index / p.length);
          }

          if (msg.msg === 'process_completed') {
            done = true;
            clearTimeout(timeout);
            es.close();
            resolve(msg.output);
          }

          if (msg.msg === 'process_starts') {
            onProgress?.(0.1);
          }

          if (msg.msg === 'error' || msg.msg === 'process_error') {
            done = true;
            clearTimeout(timeout);
            es.close();
            reject(new Error(msg.error || 'Processing error'));
          }
        } catch {}
      };

      es.onerror = () => {
        if (!done) {
          es.close();
          clearTimeout(timeout);
          this._gradioCall(baseUrl, apiName, data, sessionHash).then(resolve).catch(reject);
        }
      };
    });
  },

  _extractFileUrl(baseUrl: string, data: any): string {
    if (!data) return '';
    if (typeof data === 'string') {
      return data.startsWith('http') ? data : `${baseUrl}/file=${data}`;
    }
    if (data.url) {
      return data.url.startsWith('http') ? data.url : `${baseUrl}/file=${data.url}`;
    }
    if (data.path) {
      return `${baseUrl}/file=${data.path}`;
    }
    return '';
  },
};
