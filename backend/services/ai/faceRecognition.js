import '@tensorflow/tfjs-node';
import * as canvas from 'canvas';
import * as faceapi from '@vladmandic/face-api';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_PATH = path.join(__dirname, '../../models');

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;

export const loadModels = async () => {
    if (modelsLoaded) return;
    await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH),
        faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH),
        faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH),
    ]);
    modelsLoaded = true;
    console.log('faceRecognition: models loaded');
};

export const computeDescriptors = async (imageBuffer) => {
    await loadModels();
    const img = await canvas.loadImage(imageBuffer);
    const detections = await faceapi
        .detectAllFaces(img)
        .withFaceLandmarks()
        .withFaceDescriptors();
    return detections.map(d => Array.from(d.descriptor));
};

export const matchDescriptors = (queryDescriptors, labeledDescriptors, threshold = 0.6) => {
    if (!queryDescriptors.length || !labeledDescriptors.length) return [];

    const labeled = labeledDescriptors.map(({ name, descriptors }) =>
        new faceapi.LabeledFaceDescriptors(
            name,
            descriptors.map(d => new Float32Array(d))
        )
    );

    const matcher = new faceapi.FaceMatcher(labeled, threshold);
    const matched = new Set();

    for (const descriptor of queryDescriptors) {
        const result = matcher.findBestMatch(new Float32Array(descriptor));
        if (result.label !== 'unknown') {
            matched.add(result.label);
        }
    }

    return Array.from(matched);
};