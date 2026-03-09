import fs from 'fs';
import https from 'https';
import path from 'path';

const MODELS_DIR = './models/face';
if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true });

const download = (url, dest) => new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = (u) => https.get(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) { file.close(); return get(res.headers.location); }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
    }).on('error', err => { fs.unlink(dest, () => {}); reject(err); });
    get(url);
});

// Clean slate
console.log('Cleaning old model files...');
fs.readdirSync(MODELS_DIR).forEach(f => fs.unlinkSync(path.join(MODELS_DIR, f)));

// Download weight files from justadudewhohacks
const BASE = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
const WEIGHT_FILES = [
    'ssd_mobilenetv1_model-shard1',
    'ssd_mobilenetv1_model-shard2',
    'face_landmark_68_model.bin',
    'face_recognition_model-shard1',
    'face_recognition_model-shard2',
];

console.log('Downloading weight files...');
for (const file of WEIGHT_FILES) {
    const dest = path.join(MODELS_DIR, file);
    process.stdout.write(`  ${file}...`);
    await download(`${BASE}/${file}`, dest);
    console.log(' done');
}

// Write manifests manually with correct filenames
console.log('Writing manifests...');

fs.writeFileSync(path.join(MODELS_DIR, 'ssd_mobilenetv1_model-weights_manifest.json'), JSON.stringify([
    {
        "paths": ["ssd_mobilenetv1_model-shard1", "ssd_mobilenetv1_model-shard2"],
        "weights": [
            {"name":"conv2d/kernel","shape":[3,3,3,32],"dtype":"float32"},
            {"name":"conv2d/bias","shape":[32],"dtype":"float32"},
            {"name":"depthwise_conv2d/depthwise_kernel","shape":[3,3,32,1],"dtype":"float32"},
            {"name":"depthwise_conv2d/bias","shape":[32],"dtype":"float32"}
        ]
    }
]));

// Actually — write the real manifests by downloading just the manifests from vladmandic
// which has shard-based naming that matches the justadudewhohacks weight files
const MANIFEST_BASE = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
const MANIFESTS = [
    'ssd_mobilenetv1_model-weights_manifest.json',
    'face_landmark_68_model-weights_manifest.json', 
    'face_recognition_model-weights_manifest.json',
];

// Remove the bad manifest we just wrote
fs.unlinkSync(path.join(MODELS_DIR, 'ssd_mobilenetv1_model-weights_manifest.json'));

console.log('Downloading manifests...');
for (const file of MANIFESTS) {
    const dest = path.join(MODELS_DIR, file);
    process.stdout.write(`  ${file}...`);
    await download(`${BASE}/${file}`, dest);
    // Read and fix: replace any shard references with actual filenames
    let content = fs.readFileSync(dest, 'utf8');
    // face_landmark_68 manifest might reference shard1 — fix to .bin
    if (file.includes('face_landmark_68')) {
        content = content.replace(/face_landmark_68_model-shard1/g, 'face_landmark_68_model.bin');
        fs.writeFileSync(dest, content);
        console.log(' done (patched)');
    } else {
        console.log(' done');
    }
}

console.log('All done!');