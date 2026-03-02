import { useRef, useCallback } from 'react';

const BUILDING_COLORS = {
    '255,0,0': { target: [255, 0, 0], glow: [255, 140, 40, 155] },
    '0,255,0': { target: [0, 255, 0], glow: [60, 230, 100, 135] },
    '0,0,255': { target: [0, 0, 255], glow: [60, 160, 255, 135] },
};
const TOLERANCE = 40;

function maskUrl(index) {
    const padded = String(index).padStart(3, '0');
    return `${import.meta.env.BASE_URL}masks/mask_${padded}.webp`;
}

function matchColor(r, g, b) {
    for (const [key, { target: [tr, tg, tb] }] of Object.entries(BUILDING_COLORS)) {
        if (
            Math.abs(r - tr) < TOLERANCE &&
            Math.abs(g - tg) < TOLERANCE &&
            Math.abs(b - tb) < TOLERANCE
        ) return key;
    }
    return null;
}

async function generateOverlayData(maskData, mw, mh) {
    const bitmaps = {};
    const centroids = {};

    for (const [key, { target: [tr, tg, tb], glow: [hr, hg, hb, ha] }] of Object.entries(BUILDING_COLORS)) {
        const tmp = new OffscreenCanvas(mw, mh);
        const tCtx = tmp.getContext('2d');
        const outData = tCtx.createImageData(mw, mh);
        const src = maskData.data;
        const out = outData.data;

        let sumX = 0, sumY = 0, count = 0;
        for (let i = 0; i < src.length; i += 4) {
            if (
                Math.abs(src[i] - tr) < TOLERANCE &&
                Math.abs(src[i + 1] - tg) < TOLERANCE &&
                Math.abs(src[i + 2] - tb) < TOLERANCE
            ) {
                out[i] = hr; out[i + 1] = hg; out[i + 2] = hb; out[i + 3] = ha;
                const px = (i / 4) % mw;
                const py = Math.floor((i / 4) / mw);
                sumX += px; sumY += py; count++;
            }
        }
        tCtx.putImageData(outData, 0, 0);
        bitmaps[key] = await createImageBitmap(tmp);
        if (count > 0) {
            centroids[key] = { x: sumX / count / mw, y: sumY / count / mh };
        }
    }
    return { bitmaps, centroids };
}

/**
 * Compute the object-fit:cover draw parameters.
 * Returns { scale, offsetX, offsetY } where:
 *   offsetX/Y = where the image starts within the container (CSS px, can be negative = cropped)
 *   scale     = CSS px per image pixel
 */
function coverFit(imgW, imgH, contW, contH) {
    const imgAspect = imgW / imgH;
    const contAspect = contW / contH;
    let scale, offsetX, offsetY;
    if (imgAspect > contAspect) {
        // image wider → scale by height, crop left/right
        scale = contH / imgH;
        offsetX = (contW - imgW * scale) / 2;
        offsetY = 0;
    } else {
        // image taller → scale by width, crop top/bottom
        scale = contW / imgW;
        offsetX = 0;
        offsetY = (contH - imgH * scale) / 2;
    }
    return { scale, offsetX, offsetY };
}

export function usePixelPicker() {
    const hiddenCanvasRef = useRef(null);
    const ctxRef = useRef(null);
    const loadedFrameRef = useRef(-1);

    const bitmapCacheRef = useRef({});
    const centroidCacheRef = useRef({});
    const maskImgCacheRef = useRef({});   // frame → HTMLImageElement (loaded)
    const loadingSetRef = useRef(new Set());

    const getOverlay = useCallback((frameIndex, buildingKey) => {
        return bitmapCacheRef.current[frameIndex]?.[buildingKey] ?? null;
    }, []);

    const getCentroid = useCallback((frameIndex, buildingKey) => {
        return centroidCacheRef.current[frameIndex]?.[buildingKey] ?? null;
    }, []);

    const loadMask = useCallback((frameIndex) => {
        const canvas = hiddenCanvasRef.current;
        if (!canvas) return;
        if (!ctxRef.current) {
            ctxRef.current = canvas.getContext('2d', { willReadFrequently: true });
        }
        const ctx = ctxRef.current;

        // Already cached → re-draw immediately so canvas always matches current frame
        if (maskImgCacheRef.current[frameIndex]) {
            const img = maskImgCacheRef.current[frameIndex];
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            loadedFrameRef.current = frameIndex;
            return;
        }

        // First load — deduplicate network request
        if (loadingSetRef.current.has(frameIndex)) return;
        loadingSetRef.current.add(frameIndex);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = async () => {
            maskImgCacheRef.current[frameIndex] = img;

            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            loadedFrameRef.current = frameIndex;

            try {
                const maskData = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
                const { bitmaps, centroids } = await generateOverlayData(maskData, img.naturalWidth, img.naturalHeight);
                bitmapCacheRef.current[frameIndex] = bitmaps;
                centroidCacheRef.current[frameIndex] = centroids;
            } catch { /* OffscreenCanvas not supported */ }
        };
        img.onerror = () => { loadingSetRef.current.delete(frameIndex); };
        img.src = maskUrl(frameIndex);
    }, []);

    /**
     * Pick building under mouse — accounts for object-fit:cover transform.
     * rect = container's BoundingClientRect
     * currentFrame = frameRef.current (for stale-canvas guard)
     */
    const pickBuilding = useCallback((clientX, clientY, rect, currentFrame) => {
        const canvas = hiddenCanvasRef.current;
        const ctx = ctxRef.current;
        if (!canvas || !ctx || canvas.width === 0) return null;
        if (currentFrame !== undefined && loadedFrameRef.current !== currentFrame) return null;

        const { scale, offsetX, offsetY } = coverFit(
            canvas.width, canvas.height, rect.width, rect.height
        );

        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        // Map from container CSS coords back to mask pixel coords
        const cx = Math.floor((mouseX - offsetX) / scale);
        const cy = Math.floor((mouseY - offsetY) / scale);

        if (cx < 0 || cy < 0 || cx >= canvas.width || cy >= canvas.height) return null;

        try {
            const [r, g, b] = ctx.getImageData(cx, cy, 1, 1).data;
            return matchColor(r, g, b);
        } catch { return null; }
    }, []);

    /**
     * Draw a colour overlay bitmap onto an overlay canvas,
     * applying the same object-fit:cover transform as the frame image.
     * containerW/H = canvas's display dimensions
     */
    function drawBitmapCover(ctx, bitmap, contW, contH) {
        const { scale, offsetX, offsetY } = coverFit(
            bitmap.width, bitmap.height, contW, contH
        );
        ctx.drawImage(
            bitmap,
            offsetX, offsetY,
            bitmap.width * scale,
            bitmap.height * scale
        );
    }

    return {
        hiddenCanvasRef,
        loadMask,
        pickBuilding,
        getOverlay,
        getCentroid,
        loadedFrameRef,
        drawBitmapCover,   // export so ImageSequenceViewer can use it
    };
}
