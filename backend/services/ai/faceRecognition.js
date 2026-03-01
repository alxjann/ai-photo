import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SIDECAR = path.join(__dirname, '../../face_recognition_sidecar.py');
const PYTHON = '/Library/Frameworks/Python.framework/Versions/3.13/bin/python3';

const callPython = (input) => {
    return new Promise((resolve, reject) => {
        const proc = spawn(PYTHON, [SIDECAR]);
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', d => stdout += d);
        proc.stderr.on('data', d => stderr += d);
        proc.stdin.on('error', () => {});

        proc.on('close', code => {
            if (code !== 0) return reject(new Error(stderr || 'Python sidecar failed'));
            try {
                const result = JSON.parse(stdout);
                if (result.error) return reject(new Error(result.error));
                resolve(result);
            } catch {
                reject(new Error('Failed to parse Python output: ' + stdout));
            }
        });

        proc.stdin.write(JSON.stringify(input));
        proc.stdin.end();
    });
};

export const computeFaces = async (imageBuffer) => {
    const result = await callPython({
        action: 'compute',
        image: imageBuffer.toString('base64'),
    });
    return result.faces;
};

export const matchDescriptors = async (queryDescriptors, labeledDescriptors, threshold = 0.45) => {
    if (!queryDescriptors.length || !labeledDescriptors.length) return [];
    const result = await callPython({
        action: 'match',
        descriptors: queryDescriptors,
        labeled: labeledDescriptors,
        threshold,
    });
    return result.matches;
};

export const clusterFaces = async (faces, threshold = 0.6) => {
    if (!faces.length) return [];
    const result = await callPython({
        action: 'cluster',
        faces,
        threshold,
    });
    return result.clusters;
};