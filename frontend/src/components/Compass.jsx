import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Shared ref to pass azimuth out of Canvas
export const compassAzimuthRef = { current: 0 };

// Tiny scene component: just reads camera direction every frame
export function CameraTracker() {
    useFrame(({ camera }) => {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        compassAzimuthRef.current = Math.atan2(dir.x, dir.z);
    });
    return null;
}
