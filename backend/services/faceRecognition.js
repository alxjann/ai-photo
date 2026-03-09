import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import canvas from 'canvas';

const require = createRequire(import.meta.url);
const faceapi = require('face-api.js');

const { createCanvas, loadImage } = canvas;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = path.join(__dirname, '../models/face');

let modelsLoaded = false;

const initFaceApi = async () => {
    if (modelsLoaded) return;

    const { Canvas, Image, ImageData } = canvas;
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

    await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_DIR),
        faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_DIR),
        faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_DIR),
    ]);

    modelsLoaded = true;
    console.log('Face recognition models loaded');
};

const bufferToCanvas = async (buffer) => {
    const img = await loadImage(buffer);
    const cnv = createCanvas(img.width, img.height);
    cnv.getContext('2d').drawImage(img, 0, 0);
    return cnv;
};

export const registerFace = async (imageBuffer) => {
    await initFaceApi();
    const img = await bufferToCanvas(imageBuffer);
    console.log(`[registerFace] image size: ${img.width}x${img.height}`);
    const detection = await faceapi
        .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
    console.log(`[registerFace] detection: ${detection ? 'found' : 'NOT FOUND'}`);
    if (!detection) throw new Error('No face detected. Use a clear, front-facing photo.');
    console.log(`[registerFace] descriptor length: ${detection.descriptor.length}`);
    return Array.from(detection.descriptor);
};

export const detectFacesInImage = async (imageBuffer, knownFaces) => {
    if (!knownFaces || knownFaces.length === 0) return null;
    try {
        await initFaceApi();
        const img = await bufferToCanvas(imageBuffer);
        console.log(`[detectFaces] image size: ${img.width}x${img.height}, known faces: ${knownFaces.map(f => f.name).join(', ')}`);

        const detections = await faceapi
            .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
            .withFaceLandmarks()
            .withFaceDescriptors();

        console.log(`[detectFaces] faces detected in image: ${detections?.length ?? 0}`);
        if (!detections?.length) return null;

        const labeled = knownFaces.map(f =>
            new faceapi.LabeledFaceDescriptors(f.name, [new Float32Array(f.descriptor.map(Number))])
        );
        const matcher = new faceapi.FaceMatcher(labeled, 0.6);

        const names = new Set();
        for (const d of detections) {
            const match = matcher.findBestMatch(d.descriptor);
            console.log(`[detectFaces] match: ${match.label} (distance: ${match.distance.toFixed(3)})`);
            if (match.label !== 'unknown') names.add(match.label);
        }

        const result = names.size > 0 ? [...names].join(', ') : null;
        console.log(`[detectFaces] result: ${result ?? 'none'}`);
        return result;
    } catch (err) {
        console.error('detectFacesInImage error:', err.message);
        return null;
    }
};