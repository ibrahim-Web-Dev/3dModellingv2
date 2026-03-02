import { useState, useRef, useEffect, useCallback } from 'react';
import { usePixelPicker } from '../hooks/usePixelPicker';
import { DEMO_APARTMENTS } from '../data/apartments';
import BuildingTooltip from './BuildingTooltip';

// buildingData id → Daire listesi bina ismi
const ID_TO_BUILDING = {
    A_BLOK: 'A Blok',
    B_BLOK: 'B Blok',
    C_BLOK: 'C Blok',
};

function getAvailable(buildingId) {
    const name = ID_TO_BUILDING[buildingId];
    if (!name) return null;
    const all = DEMO_APARTMENTS.filter(a => a.building === name);
    const avail = all.filter(a => a.status === 'For Sale' || a.status === 'Satışta');
    return { available: avail.length, total: all.length };
}

const TOTAL_FRAMES = 120;  // 3° adımlarla 120 frame → 360° tam tur
const FRAME_STEP = 3;      // gerçek dosya index = mantıksal × FRAME_STEP
const PX_PER_FRAME = 4;
const HOTSPOT_DELAY_MS = 400;

// Masaüstü: frames/ (1920px)  |  Mobil (≤640px): frames_sm/ (640px, 17× küçük)
const IS_MOBILE = window.matchMedia('(max-width: 640px)').matches;
const FRAME_DIR = IS_MOBILE ? 'frames_sm' : 'frames';

function frameUrl(index) {
    const padded = String(index * FRAME_STEP).padStart(3, '0');
    return `${import.meta.env.BASE_URL}${FRAME_DIR}/frame_${padded}.webp`;
}

export default function ImageSequenceViewer({
    hotspots = {},
    onHotspotClick,
    calibrationMode = false,
    buildingData = {},
    onBuildingHover,
    onBuildingClick,
    availableCounts = {},
}) {

    const [frameIndex, setFrameIndex] = useState(0);
    const [showHotspots, setShowHotspots] = useState(false);
    const [loadedCount, setLoadedCount] = useState(0);
    const [firstFrameReady, setFirstFrameReady] = useState(false);
    const [hoveredBuilding, setHoveredBuilding] = useState(null);

    const frameRef = useRef(0);
    const isDragging = useRef(false);
    const lastX = useRef(0);
    const touchStartRef = useRef({ x: 0, y: 0 });
    const velocityRef = useRef(0);
    const inertiaRafRef = useRef(null);
    const animateRafRef = useRef(null);
    const hotspotTimerRef = useRef(null);
    const imgRef = useRef(null);
    const containerRef = useRef(null);
    const overlayCanvasRef = useRef(null);
    const overlayRafRef = useRef(null);
    const lastOverlayKeyRef = useRef(null);
    const mousePosRef = useRef({ x: 0, y: 0 });
    const lastHoveredRef = useRef(null);
    const isOverNavRef = useRef(false);

    const { hiddenCanvasRef, loadMask, pickBuilding, getOverlay, getCentroid, drawBitmapCover } = usePixelPicker();

    // ── Preload frames ────────────────────────────────────────────────────
    useEffect(() => {
        // Frame 0'ı önce yükle — yüklenince loading ekranı kalkar
        const first = new Image();
        first.onload = () => { setFirstFrameReady(true); setLoadedCount(1); };
        first.onerror = () => setFirstFrameReady(true);
        first.src = frameUrl(0);

        // Geri kalanları 10'arlı gruplar halinde arka planda yükle
        const BATCH = 10;
        let batch = 0;
        const loadBatch = () => {
            const start = 1 + batch * BATCH;
            if (start >= TOTAL_FRAMES) return;
            for (let i = start; i < Math.min(start + BATCH, TOTAL_FRAMES); i++) {
                const img = new Image();
                img.onload = () => setLoadedCount(prev => prev + 1);
                img.src = frameUrl(i);
            }
            batch++;
            setTimeout(loadBatch, 200);
        };
        setTimeout(loadBatch, 100);
    }, []);

    // ── Load mask on frame change ─────────────────────────────────────────
    useEffect(() => {
        loadMask(frameIndex);
    }, [frameIndex, loadMask]);

    // ── Frame renderer ────────────────────────────────────────────────────
    const goToFrame = useCallback((idx) => {
        const clamped = ((Math.round(idx) % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
        if (clamped !== frameRef.current) lastOverlayKeyRef.current = null;
        frameRef.current = clamped;
        setFrameIndex(clamped);
    }, []);

    // ── Hotspot visibility ────────────────────────────────────────────────
    const scheduleHotspots = useCallback(() => {
        clearTimeout(hotspotTimerRef.current);
        setShowHotspots(false);
        hotspotTimerRef.current = setTimeout(() => setShowHotspots(true), HOTSPOT_DELAY_MS);
    }, []);

    const hideHotspots = useCallback(() => {
        clearTimeout(hotspotTimerRef.current);
        setShowHotspots(false);
    }, []);

    // ── Overlay canvas ────────────────────────────────────────────────────
    // IMPORTANT: drawOverlay must be defined BEFORE startInertia (no forward ref)
    const drawOverlay = useCallback((buildingKey, building) => {
        const canvas = overlayCanvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        const { width, height } = container.getBoundingClientRect();

        if (!buildingKey || !building) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            lastOverlayKeyRef.current = null;
            return;
        }

        const currentFrame = frameRef.current;
        const cacheKey = `${buildingKey}_${currentFrame}`;
        if (lastOverlayKeyRef.current === cacheKey) return;

        const bitmap = getOverlay(currentFrame, buildingKey);
        if (!bitmap) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        lastOverlayKeyRef.current = cacheKey;
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);
        // Draw with the same object-fit:cover transform as the frame image
        drawBitmapCover(ctx, bitmap, width, height);
    }, [getOverlay, drawBitmapCover]);

    // ── Inertia ───────────────────────────────────────────────────────────
    const startInertia = useCallback(() => {
        cancelAnimationFrame(inertiaRafRef.current);
        // Clear hover immediately — prevents stale overlay during frame changes
        setHoveredBuilding(null);
        onBuildingHover?.(null);
        drawOverlay(null, null);
        lastOverlayKeyRef.current = null;

        let vel = velocityRef.current;
        const step = () => {
            if (Math.abs(vel) < 0.05) { scheduleHotspots(); return; }
            frameRef.current = Math.round(
                ((frameRef.current - vel / PX_PER_FRAME) % TOTAL_FRAMES + TOTAL_FRAMES) % TOTAL_FRAMES
            );
            setFrameIndex(frameRef.current);
            vel *= 0.88;
            inertiaRafRef.current = requestAnimationFrame(step);
        };
        inertiaRafRef.current = requestAnimationFrame(step);
    }, [scheduleHotspots, onBuildingHover, drawOverlay]);

    // ── Animated jump ─────────────────────────────────────────────────────
    const animateTo = useCallback((delta) => {
        cancelAnimationFrame(inertiaRafRef.current);
        cancelAnimationFrame(animateRafRef.current);
        hideHotspots();
        const startFrame = frameRef.current;
        const target = ((startFrame + delta) % TOTAL_FRAMES + TOTAL_FRAMES) % TOTAL_FRAMES;
        const DURATION = 600;
        const startTime = performance.now();
        const step = (now) => {
            const t = Math.min((now - startTime) / DURATION, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            let diff = target - startFrame;
            if (Math.abs(diff) > TOTAL_FRAMES / 2)
                diff = diff > 0 ? diff - TOTAL_FRAMES : diff + TOTAL_FRAMES;
            const cur = Math.round(((startFrame + diff * eased) % TOTAL_FRAMES + TOTAL_FRAMES) % TOTAL_FRAMES);
            frameRef.current = cur;
            setFrameIndex(cur);
            if (t < 1) animateRafRef.current = requestAnimationFrame(step);
            else scheduleHotspots();
        };
        animateRafRef.current = requestAnimationFrame(step);
    }, [hideHotspots, scheduleHotspots]);

    // ── Mouse events ──────────────────────────────────────────────────────
    const onMouseDown = useCallback((e) => {
        isDragging.current = true;
        lastX.current = e.clientX;
        velocityRef.current = 0;
        cancelAnimationFrame(inertiaRafRef.current);
        hideHotspots();
        lastHoveredRef.current = hoveredBuilding;
        setHoveredBuilding(null);
        onBuildingHover?.(null);
        drawOverlay(null, null);
        e.preventDefault();
    }, [hideHotspots, onBuildingHover, drawOverlay, hoveredBuilding]);

    const onMouseMove = useCallback((e) => {
        mousePosRef.current = { x: e.clientX, y: e.clientY };

        if (isDragging.current) {
            const dx = e.clientX - lastX.current;
            velocityRef.current = dx;
            lastX.current = e.clientX;
            goToFrame(Math.round(
                ((frameRef.current - dx / PX_PER_FRAME) % TOTAL_FRAMES + TOTAL_FRAMES) % TOTAL_FRAMES
            ));
            return;
        }

        if (isOverNavRef.current) return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const key = pickBuilding(e.clientX, e.clientY, rect, frameRef.current);
        const building = key ? buildingData[key] : null;

        if (building?.id !== hoveredBuilding?.id) {
            lastHoveredRef.current = building;
            setHoveredBuilding(building);
            onBuildingHover?.(building);
            drawOverlay(key, building);
        }
    }, [goToFrame, pickBuilding, buildingData, hoveredBuilding, onBuildingHover, drawOverlay]);

    const onMouseUp = useCallback(() => {
        if (!isDragging.current) return;
        isDragging.current = false;
        startInertia();
    }, [startInertia]);

    const onMouseLeave = useCallback(() => {
        onMouseUp();
        setHoveredBuilding(null);
        onBuildingHover?.(null);
        drawOverlay(null, null);
        lastOverlayKeyRef.current = null;
    }, [onMouseUp, onBuildingHover, drawOverlay]);

    const onViewerClick = useCallback((e) => {
        if (calibrationMode) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width).toFixed(4);
            const y = ((e.clientY - rect.top) / rect.height).toFixed(4);
            console.log(`Frame ${frameRef.current} → Hotspot:`, JSON.stringify(
                { id: 'APARTMENT_ID', label: 'Daire Adı', x: parseFloat(x), y: parseFloat(y) }, null, 2
            ));
            return;
        }
        const building = hoveredBuilding || lastHoveredRef.current;
        if (building) onBuildingClick?.(building);
    }, [calibrationMode, hoveredBuilding, onBuildingClick]);

    // ── Touch events ──────────────────────────────────────────────────────
    const onTouchStart = useCallback((e) => {
        isDragging.current = true;
        lastX.current = e.touches[0].clientX;
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        velocityRef.current = 0;
        cancelAnimationFrame(inertiaRafRef.current);
        hideHotspots();
    }, [hideHotspots]);

    const onTouchMove = useCallback((e) => {
        if (!isDragging.current) return;
        const dx = e.touches[0].clientX - lastX.current;
        velocityRef.current = dx;
        lastX.current = e.touches[0].clientX;
        goToFrame(Math.round(
            ((frameRef.current - dx / PX_PER_FRAME) % TOTAL_FRAMES + TOTAL_FRAMES) % TOTAL_FRAMES
        ));
        e.preventDefault();
    }, [goToFrame]);

    const onTouchEnd = useCallback((e) => {
        if (!isDragging.current) return;
        isDragging.current = false;

        // Parmak az hareket ettiyse → tap, bina tıklaması say
        const touch = e.changedTouches[0];
        const dx = Math.abs(touch.clientX - touchStartRef.current.x);
        const dy = Math.abs(touch.clientY - touchStartRef.current.y);
        if (dx < 10 && dy < 10) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                const key = pickBuilding(touch.clientX, touch.clientY, rect, frameRef.current);
                const building = key ? buildingData[key] : null;
                if (building) { onBuildingClick?.(building); return; }
            }
        }

        startInertia();
    }, [startInertia, pickBuilding, buildingData, onBuildingClick]);

    // ── Keyboard ──────────────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'ArrowLeft') { hideHotspots(); goToFrame(frameRef.current - 1); scheduleHotspots(); }
            if (e.key === 'ArrowRight') { hideHotspots(); goToFrame(frameRef.current + 1); scheduleHotspots(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [goToFrame, hideHotspots, scheduleHotspots]);

    useEffect(() => {
        if (firstFrameReady) scheduleHotspots();
    }, [firstFrameReady, scheduleHotspots]);

    useEffect(() => () => {
        cancelAnimationFrame(inertiaRafRef.current);
        cancelAnimationFrame(animateRafRef.current);
        cancelAnimationFrame(overlayRafRef.current);
        clearTimeout(hotspotTimerRef.current);
    }, []);

    const currentHotspots = hotspots[String(frameIndex)] || [];
    const loadPercent = Math.round((loadedCount / TOTAL_FRAMES) * 100);
    const isLoading = !firstFrameReady;

    return (
        <div
            ref={containerRef}
            className="viewer-container"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onClick={onViewerClick}
            style={{ cursor: isDragging.current ? 'grabbing' : hoveredBuilding ? 'pointer' : 'grab' }}
        >
            <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />

            {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-inner">
                        <div className="loading-spinner" />
                        <div className="loading-text">Yükleniyor… {loadPercent}%</div>
                        <div className="loading-bar-track">
                            <div className="loading-bar-fill" style={{ width: `${loadPercent}%` }} />
                        </div>
                    </div>
                </div>
            )}

            <img
                ref={imgRef}
                src={frameUrl(frameIndex)}
                className="frame-img"
                alt=""
                draggable={false}
            />

            <canvas
                ref={overlayCanvasRef}
                className="overlay-canvas"
                style={{ pointerEvents: 'none' }}
            />

            {showHotspots && currentHotspots.map((hs) => (
                <button
                    key={hs.id}
                    className={`hotspot ${showHotspots ? 'visible' : ''}`}
                    style={{ left: `${hs.x * 100}%`, top: `${hs.y * 100}%` }}
                    onClick={(e) => { e.stopPropagation(); onHotspotClick?.(hs.id); }}
                    title={hs.label}
                >
                    <span className="hotspot-dot" />
                    <span className="hotspot-label">{hs.label}</span>
                </button>
            ))}

            {showHotspots && Object.entries(buildingData).map(([key, building]) => {
                const c = getCentroid(frameIndex, key);
                if (!c) return null;
                return (
                    <div
                        key={key}
                        className="building-label"
                        style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
                        onMouseEnter={() => {
                            setHoveredBuilding(building);
                            onBuildingHover?.(building);
                            drawOverlay(key, building);
                        }}
                        onMouseLeave={() => { }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onBuildingClick?.(building); }}
                    >
                        <div className="building-label-card">
                            <span className="building-label-name">{building.name}</span>
                            {(() => {
                                const buildingName = ID_TO_BUILDING[building.id];
                                const count = (buildingName && availableCounts[buildingName] !== undefined)
                                    ? availableCounts[buildingName]
                                    : (getAvailable(building.id)?.available ?? null);
                                if (count === null) return null;
                                const color = count === 0 ? '#ff5252' : count <= 3 ? '#ffab40' : '#69f0ae';
                                return (
                                    <span className="building-label-sub" style={{ color }}>
                                        {count === 0 ? 'Tükenmiş' : `${count} daire kaldı`}
                                    </span>
                                );
                            })()}
                        </div>
                        <div className="building-label-line" />
                        <div className="building-label-dot" />
                    </div>
                );
            })}

            <button className="nav-arrow nav-left"
                onMouseDown={e => e.stopPropagation()}
                onMouseEnter={() => {
                    isOverNavRef.current = true;
                    setHoveredBuilding(null);
                    onBuildingHover?.(null);
                    drawOverlay(null, null);
                    lastOverlayKeyRef.current = null;
                }}
                onMouseLeave={() => { isOverNavRef.current = false; }}
                onClick={(e) => { e.stopPropagation(); animateTo(-20); }}>
                ‹
            </button>
            <button className="nav-arrow nav-right"
                onMouseDown={e => e.stopPropagation()}
                onMouseEnter={() => {
                    isOverNavRef.current = true;
                    setHoveredBuilding(null);
                    onBuildingHover?.(null);
                    drawOverlay(null, null);
                    lastOverlayKeyRef.current = null;
                }}
                onMouseLeave={() => { isOverNavRef.current = false; }}
                onClick={(e) => { e.stopPropagation(); animateTo(+20); }}>
                ›
            </button>

            {calibrationMode && (
                <div className="calibration-banner">
                    🎯 KALİBRASYON MODU — Bir noktaya tıkla, koordinatlar konsola yazılır (F12)
                </div>
            )}

            {/* Tooltip viewer-container içinde — onMouseLeave sorunu olmaz */}
            <BuildingTooltip
                building={hoveredBuilding}
                mouseX={mousePosRef.current.x}
                mouseY={mousePosRef.current.y}
                availableCounts={availableCounts}
                onClick={onBuildingClick}
            />
        </div>
    );
}
