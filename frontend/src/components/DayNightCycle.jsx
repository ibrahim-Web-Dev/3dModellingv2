import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Lerp between two colors by t (0..1)
function lerpColor(a, b, t) {
    return new THREE.Color(
        a.r + (b.r - a.r) * t,
        a.g + (b.g - a.g) * t,
        a.b + (b.b - a.b) * t
    );
}

const NIGHT_SKY = new THREE.Color('#050a1a');
const DAWN_SKY = new THREE.Color('#ff6b35');
const DAY_SKY = new THREE.Color('#87ceeb');
const DUSK_SKY = new THREE.Color('#f4845f');

const NIGHT_AMB = 0.55;
const DAY_AMB = 1.2;

const NIGHT_SUN = 0.0;
const DAY_SUN = 2.5;

// t: 0..1 representing time of day (0 = midnight, 0.5 = noon)
function getSkyColor(t) {
    if (t < 0.2) return lerpColor(NIGHT_SKY, DAWN_SKY, t / 0.2);
    if (t < 0.3) return lerpColor(DAWN_SKY, DAY_SKY, (t - 0.2) / 0.1);
    if (t < 0.7) return DAY_SKY.clone();
    if (t < 0.8) return lerpColor(DAY_SKY, DUSK_SKY, (t - 0.7) / 0.1);
    if (t < 0.9) return lerpColor(DUSK_SKY, NIGHT_SKY, (t - 0.8) / 0.1);
    return NIGHT_SKY.clone();
}

function getAmbient(t) {
    if (t < 0.2) return THREE.MathUtils.lerp(NIGHT_AMB, DAY_AMB * 0.6, t / 0.2);
    if (t < 0.3) return THREE.MathUtils.lerp(DAY_AMB * 0.6, DAY_AMB, (t - 0.2) / 0.1);
    if (t < 0.7) return DAY_AMB;
    if (t < 0.9) return THREE.MathUtils.lerp(DAY_AMB, NIGHT_AMB, (t - 0.7) / 0.2);
    return NIGHT_AMB;
}

function getSunIntensity(t) {
    if (t < 0.2) return 0;
    if (t < 0.3) return THREE.MathUtils.lerp(0, DAY_SUN * 0.5, (t - 0.2) / 0.1);
    if (t < 0.7) return DAY_SUN;
    if (t < 0.8) return THREE.MathUtils.lerp(DAY_SUN, DAY_SUN * 0.3, (t - 0.7) / 0.1);
    if (t < 0.9) return THREE.MathUtils.lerp(DAY_SUN * 0.3, 0, (t - 0.8) / 0.1);
    return 0;
}

// Sun position: arc across the sky. t=0 midnight, t=0.5 noon
function getSunPosition(t) {
    const angle = (t - 0.5) * Math.PI; // -PI/2 at midnight, 0 at noon, PI/2 at midnight
    const elevation = Math.sin(angle) * 80;    // height
    const horizontal = Math.cos(angle) * 60;   // east-west
    return new THREE.Vector3(horizontal, elevation, -20);
}

export function DayNightCycle({ timeRef, sceneRef }) {
    const sunRef = useRef();
    const ambRef = useRef();
    const bgRef = useRef(new THREE.Color());

    useFrame(({ scene }) => {
        const t = timeRef.current ?? 0.5;
        const sky = getSkyColor(t);
        scene.background = sky;

        if (sunRef.current) {
            sunRef.current.intensity = getSunIntensity(t);
            const pos = getSunPosition(t);
            sunRef.current.position.set(pos.x, pos.y, pos.z);
        }
        if (ambRef.current) {
            ambRef.current.intensity = getAmbient(t);
        }
    });

    return (
        <>
            <ambientLight ref={ambRef} intensity={DAY_AMB} />
            <directionalLight ref={sunRef} position={[0, 80, -20]} intensity={DAY_SUN} color="#fff8e7" />
            {/* Moonlight: faint blue for night */}
            <directionalLight position={[-30, 40, 30]} intensity={0.35} color="#aabbff" />
        </>
    );
}
