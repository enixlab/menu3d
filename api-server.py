#!/usr/bin/env python3
"""
Menu3D — Serveur API de reconstruction 3D
Convertit une photo en modèle 3D GLB via frogleo/Image-to-3D (HuggingFace)
~14 secondes par modèle, GRATUIT, pas de clé API
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
from gradio_client import Client, handle_file
import json, os, shutil, uuid, time, threading, urllib.parse

PORT = 3001
STATIC_DIR = os.path.join(os.path.dirname(__file__), 'public', 'models')
os.makedirs(STATIC_DIR, exist_ok=True)

# Task storage
tasks = {}

def generate_3d(task_id: str, image_url: str):
    """Background: photo → GLB via HuggingFace"""
    try:
        tasks[task_id]['status'] = 'processing'
        tasks[task_id]['progress'] = 10
        tasks[task_id]['step'] = 'Connexion au serveur IA...'

        client = Client("frogleo/Image-to-3D")
        tasks[task_id]['progress'] = 20
        tasks[task_id]['step'] = 'Upload de la photo...'

        output_html, download_file, glb_path, obj_path = client.predict(
            image=handle_file(image_url),
            steps=5,
            guidance_scale=5.5,
            seed=1234,
            octree_resolution=256,
            num_chunks=8000,
            target_face_num=20000,
            randomize_seed=False,
            api_name="/gen_shape"
        )

        tasks[task_id]['progress'] = 90
        tasks[task_id]['step'] = 'Telechargement du modele...'

        # Download the GLB from HF Space
        if glb_path:
            base_url = "https://frogleo-image-to-3d.hf.space"
            glb_url = f"{base_url}{glb_path}"

            import urllib.request
            filename = f"{task_id}.glb"
            local_path = os.path.join(STATIC_DIR, filename)
            urllib.request.urlretrieve(glb_url, local_path)

            size = os.path.getsize(local_path)
            tasks[task_id]['status'] = 'done'
            tasks[task_id]['progress'] = 100
            tasks[task_id]['step'] = 'Modele 3D pret !'
            tasks[task_id]['glb_url'] = f"/models/{filename}"
            tasks[task_id]['size'] = size
            print(f"[OK] Task {task_id}: GLB {size} bytes")
        else:
            raise Exception("No GLB path returned")

    except Exception as e:
        tasks[task_id]['status'] = 'error'
        tasks[task_id]['error'] = str(e)
        print(f"[ERR] Task {task_id}: {e}")


class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/reconstruct':
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length)) if length else {}
            image_url = body.get('image_url', '')

            if not image_url:
                self._json(400, {'error': 'image_url required'})
                return

            task_id = str(uuid.uuid4())[:8]
            tasks[task_id] = {
                'status': 'queued',
                'progress': 0,
                'step': 'En attente...',
                'glb_url': '',
                'error': '',
            }

            # Lance en background
            threading.Thread(target=generate_3d, args=(task_id, image_url), daemon=True).start()
            self._json(200, {'task_id': task_id})
        else:
            self._json(404, {'error': 'not found'})

    def do_GET(self):
        if self.path.startswith('/api/status/'):
            task_id = self.path.split('/')[-1]
            if task_id in tasks:
                self._json(200, tasks[task_id])
            else:
                self._json(404, {'error': 'task not found'})

        elif self.path.startswith('/models/'):
            # Servir les fichiers GLB statiques
            filename = self.path.split('/')[-1]
            filepath = os.path.join(STATIC_DIR, filename)
            if os.path.exists(filepath):
                self.send_response(200)
                self.send_header('Content-Type', 'model/gltf-binary')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(os.path.getsize(filepath)))
                self.end_headers()
                with open(filepath, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self._json(404, {'error': 'file not found'})
        else:
            self._json(200, {
                'service': 'Menu3D Reconstruction API',
                'endpoints': {
                    'POST /api/reconstruct': 'Start 3D reconstruction from image_url',
                    'GET /api/status/<task_id>': 'Check reconstruction status',
                    'GET /models/<file>.glb': 'Download generated GLB',
                },
            })

    def _json(self, code, data):
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, format, *args):
        print(f"[API] {args[0]}")


if __name__ == '__main__':
    print(f"Menu3D 3D Reconstruction API running on http://localhost:{PORT}")
    print(f"GLB files stored in: {STATIC_DIR}")
    HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
