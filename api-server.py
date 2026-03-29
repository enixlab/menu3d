#!/usr/bin/env python3
"""
Menu3D — Serveur API de reconstruction 3D
Photo → Modèle 3D GLB en ~15 secondes via frogleo/Image-to-3D
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
from gradio_client import Client, handle_file
import json, os, shutil, uuid, time, threading, urllib.request, tempfile, base64, re

PORT = 3001
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public', 'models')
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public', 'uploads')
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

tasks = {}


def generate_3d(task_id: str, image_path: str):
    """Background: photo file → GLB via HuggingFace frogleo/Image-to-3D"""
    try:
        tasks[task_id]['status'] = 'processing'
        tasks[task_id]['progress'] = 15
        tasks[task_id]['step'] = 'Connexion au serveur IA...'

        client = Client("frogleo/Image-to-3D")

        tasks[task_id]['progress'] = 25
        tasks[task_id]['step'] = 'Generation du modele 3D...'

        output_html, download_file, glb_path, obj_path = client.predict(
            image=handle_file(image_path),
            steps=5,
            guidance_scale=5.5,
            seed=1234,
            octree_resolution=256,
            num_chunks=8000,
            target_face_num=20000,
            randomize_seed=False,
            api_name="/gen_shape"
        )

        tasks[task_id]['progress'] = 85
        tasks[task_id]['step'] = 'Telechargement du modele GLB...'

        if glb_path:
            base_url = "https://frogleo-image-to-3d.hf.space"
            glb_url = f"{base_url}{glb_path}"

            filename = f"{task_id}.glb"
            local_path = os.path.join(STATIC_DIR, filename)
            urllib.request.urlretrieve(glb_url, local_path)

            size = os.path.getsize(local_path)
            tasks[task_id]['status'] = 'done'
            tasks[task_id]['progress'] = 100
            tasks[task_id]['step'] = 'Modele 3D pret !'
            tasks[task_id]['glb_url'] = f"/models/{filename}"
            tasks[task_id]['size'] = size
            print(f"[OK] {task_id}: {size} bytes → {filename}")
        else:
            raise Exception("No GLB returned from HuggingFace")

    except Exception as e:
        tasks[task_id]['status'] = 'error'
        tasks[task_id]['error'] = str(e)
        print(f"[ERR] {task_id}: {e}")


class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/upload':
            # Upload image (multipart form ou base64 JSON)
            content_type = self.headers.get('Content-Type', '')
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)

            filename = f"{uuid.uuid4().hex[:10]}.jpg"
            filepath = os.path.join(UPLOAD_DIR, filename)

            if 'application/json' in content_type:
                # Base64 JSON upload
                data = json.loads(body)
                b64 = data.get('image', '')
                # Remove data:image/...;base64, prefix
                if ',' in b64:
                    b64 = b64.split(',', 1)[1]
                with open(filepath, 'wb') as f:
                    f.write(base64.b64decode(b64))
            else:
                # Raw binary or multipart
                # Simple: save raw body as image
                # Strip multipart boundaries if present
                if b'boundary' in content_type.encode():
                    # Parse multipart manually
                    boundary = content_type.split('boundary=')[1].strip()
                    parts = body.split(f'--{boundary}'.encode())
                    for part in parts:
                        if b'Content-Type: image' in part or b'content-type: image' in part:
                            # Find the blank line separating headers from body
                            idx = part.find(b'\r\n\r\n')
                            if idx > 0:
                                img_data = part[idx+4:]
                                # Remove trailing boundary markers
                                if img_data.endswith(b'\r\n'):
                                    img_data = img_data[:-2]
                                if img_data.endswith(b'--'):
                                    img_data = img_data[:-2]
                                with open(filepath, 'wb') as f:
                                    f.write(img_data)
                                break
                else:
                    with open(filepath, 'wb') as f:
                        f.write(body)

            if os.path.exists(filepath) and os.path.getsize(filepath) > 100:
                url = f"/uploads/{filename}"
                self._json(200, {'url': url, 'path': filepath})
            else:
                self._json(400, {'error': 'Failed to save image'})

        elif self.path == '/api/reconstruct':
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length)) if length else {}

            image_url = body.get('image_url', '')
            image_path = body.get('image_path', '')

            # Si c'est un path local (uploadé via /api/upload)
            if image_path and os.path.exists(image_path):
                source = image_path
            elif image_url.startswith('/uploads/'):
                source = os.path.join(UPLOAD_DIR, os.path.basename(image_url))
            elif image_url.startswith('http'):
                source = image_url
            elif image_url.startswith('data:'):
                # Base64 data URI → sauvegarder en fichier
                b64 = image_url.split(',', 1)[1] if ',' in image_url else image_url
                tmpfile = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex[:8]}.jpg")
                with open(tmpfile, 'wb') as f:
                    f.write(base64.b64decode(b64))
                source = tmpfile
            else:
                self._json(400, {'error': 'image_url or image_path required'})
                return

            task_id = uuid.uuid4().hex[:8]
            tasks[task_id] = {
                'status': 'queued',
                'progress': 5,
                'step': 'En attente...',
                'glb_url': '',
                'error': '',
            }

            threading.Thread(target=generate_3d, args=(task_id, source), daemon=True).start()
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
            self._serve_file(STATIC_DIR, 'model/gltf-binary')

        elif self.path.startswith('/uploads/'):
            self._serve_file(UPLOAD_DIR, 'image/jpeg')

        else:
            self._json(200, {
                'service': 'Menu3D Reconstruction API',
                'status': 'running',
                'active_tasks': len([t for t in tasks.values() if t['status'] == 'processing']),
            })

    def _serve_file(self, directory, mime):
        filename = os.path.basename(self.path)
        filepath = os.path.join(directory, filename)
        if os.path.exists(filepath):
            self.send_response(200)
            self.send_header('Content-Type', mime)
            self._cors()
            self.send_header('Content-Length', str(os.path.getsize(filepath)))
            self.end_headers()
            with open(filepath, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self._json(404, {'error': 'file not found'})

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

    def log_message(self, fmt, *args):
        print(f"[{time.strftime('%H:%M:%S')}] {args[0]}")


if __name__ == '__main__':
    print(f"Menu3D 3D API → http://localhost:{PORT}")
    HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
