import sys
import warnings
warnings.filterwarnings('ignore')
import json
import face_recognition
import numpy as np
from PIL import Image
import io
import base64

MAX_FACES = 5

def compute_faces(image_bytes):
    image = face_recognition.load_image_file(io.BytesIO(image_bytes))
    locations = face_recognition.face_locations(image)
    if not locations:
        return []
    locations = locations[:MAX_FACES]
    encodings = face_recognition.face_encodings(image, locations)
    return [
        { 'descriptor': enc.tolist(), 'location': loc }
        for enc, loc in zip(encodings, locations)
    ]

def match_descriptors(query_descriptors, labeled_descriptors, threshold=0.45):
    matched = set()
    for query in query_descriptors:
        query_enc = np.array(query)
        for person in labeled_descriptors:
            name = person['name']
            known = [np.array(d) for d in person['descriptors']]
            if not known:
                continue
            distances = face_recognition.face_distance(known, query_enc)
            if min(distances) <= threshold:
                matched.add(name)
    return list(matched)

def cluster_faces(all_faces, threshold=0.6):
    if not all_faces:
        return []
    clusters = []
    for face in all_faces:
        enc = np.array(face['descriptor'])
        matched_cluster = None
        best_distance = threshold
        for cluster in clusters:
            known = [np.array(d) for d in cluster['descriptors']]
            distances = face_recognition.face_distance(known, enc)
            avg_dist = float(np.mean(distances))
            if avg_dist < best_distance:
                best_distance = avg_dist
                matched_cluster = cluster
        if matched_cluster:
            matched_cluster['descriptors'].append(face['descriptor'])
            matched_cluster['photo_ids'].append(face['photo_id'])
            matched_cluster['face_counts'].append(face['face_count'])
        else:
            clusters.append({
                'descriptors': [face['descriptor']],
                'photo_ids': [face['photo_id']],
                'face_counts': [face['face_count']],
            })
    result = []
    for cluster in clusters:
        if len(cluster['descriptors']) < 2:
            continue
        best_photo_id = None
        for photo_id, face_count in zip(cluster['photo_ids'], cluster['face_counts']):
            if face_count == 1:
                best_photo_id = photo_id
                break
        if not best_photo_id:
            best_photo_id = cluster['photo_ids'][0]
        result.append({
            'descriptors': cluster['descriptors'],
            'representative_photo_id': best_photo_id,
        })
    return result

if __name__ == '__main__':
    input_data = json.loads(sys.stdin.read())
    action = input_data.get('action')

    try:
        if action == 'compute':
            image_bytes = base64.b64decode(input_data['image'])
            faces = compute_faces(image_bytes)
            print(json.dumps({ 'faces': faces }))

        elif action == 'match':
            descriptors = input_data['descriptors']
            labeled = input_data['labeled']
            threshold = input_data.get('threshold', 0.6)
            matches = match_descriptors(descriptors, labeled, threshold)
            print(json.dumps({ 'matches': matches }))

        elif action == 'cluster':
            faces = input_data['faces']
            threshold = input_data.get('threshold', 0.6)
            clusters = cluster_faces(faces, threshold)
            print(json.dumps({ 'clusters': clusters }))

    except Exception as e:
        print(json.dumps({ 'error': str(e) }))
        sys.exit(1)