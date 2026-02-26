import { useState, useRef, useEffect, useCallback } from 'react';

const TOTAL_FRAMES = 240;
// Drag sensitivity: kaç piksel sürükleme = 1 frame değişimi
const PX_PER_FRAME = 6;
// Kaç ms sonra hotspot'lar görünür (sürükleme durduktan sonra)
const HOTSPOT_DELAY_MS = 400;

function frameUrl(index) {
    const i = Math.round(index); // HER ZAMAN integer
    const padded = String(i).padStart(3, '0');
    return `${import.meta.env.BASE_URL}frames/frame_${padded}.webp`;
}

/**
 * ImageSequenceViewer
 * Props:
 *   hotspots     : object { "frameIndex": [{id, label, x, y}, ...] }
 *   onHotspotClick: (apartmentId) => void
 *   calibrationMode: bool — tıklanan noktanın koordinatlarını konsola yazar
 */
export default function ImageSequenceViewer({ hotspots = {}, onHotspotClick, calibrationMode = false }) {
    const [frameIndex, setFrameIndex] = useState(0);
    const [showHotspots, setShowHotspots] = useState(false);
    const [loadedCount, setLoadedCount] = useState(0);

    const frameRef = useRef(0);
    const isDragging = useRef(false);
    const lastX = useRef(0);
    const velocityRef = useRef(0);
    const inertiaRafRef = useRef(null);
    const hotspotTimerRef = useRef(null);
    const imgRef = useRef(null);
    const containerRef = useRef(null);

    // ── Preload all frames ──────────────────────────────────────────────
    useEffect(() => {
        let loaded = 0;
        for (let i = 0; i < TOTAL_FRAMES; i++) {
            const img = new Image();
            img.onload = () => {
                loaded++;
                setLoadedCount(loaded);
            };
            img.src = frameUrl(i);
        }
    }, []);

    // ── Frame renderer ──────────────────────────────────────────────────
    const goToFrame = useCallback((idx) => {
        const rounded = Math.round(idx); // FLOAT'tan korur
        const clamped = ((rounded % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
        frameRef.current = clamped;
        setFrameIndex(clamped);
    }, []);

    // ── Hotspot show/hide logic ─────────────────────────────────────────
    const scheduleHotspots = useCallback(() => {
        clearTimeout(hotspotTimerRef.current);
        setShowHotspots(false);
        hotspotTimerRef.current = setTimeout(() => {
            setShowHotspots(true);
        }, HOTSPOT_DELAY_MS);
    }, []);

    const hideHotspots = useCallback(() => {
        clearTimeout(hotspotTimerRef.current);
        setShowHotspots(false);
    }, []);

    // ── Inertia ─────────────────────────────────────────────────────────
    const startInertia = useCallback(() => {
        cancelAnimationFrame(inertiaRafRef.current);
        let vel = velocityRef.current;
        const step = () => {
            if (Math.abs(vel) < 0.05) {
                scheduleHotspots();
                return;
            }
            frameRef.current = Math.round(((frameRef.current - vel / PX_PER_FRAME) % TOTAL_FRAMES + TOTAL_FRAMES) % TOTAL_FRAMES);
            setFrameIndex(frameRef.current);
            vel *= 0.88; // friction
            inertiaRafRef.current = requestAnimationFrame(step);
        };
        inertiaRafRef.current = requestAnimationFrame(step);
    }, [scheduleHotspots]);

    // ── Animated jump (ok butonları için) ───────────────────────────────
    const animateRafRef = useRef(null);
    const animateTo = useCallback((delta) => {
        // Mevcut inertia veya animasyonu durdur
        cancelAnimationFrame(inertiaRafRef.current);
        cancelAnimationFrame(animateRafRef.current);
        hideHotspots();

        const startFrame = frameRef.current;
        const totalFrames = TOTAL_FRAMES;
        // Hedef frame (negatif delta = sola)
        const target = ((startFrame + delta) % totalFrames + totalFrames) % totalFrames;

        // Animasyon süresi ms
        const DURATION = 600;
        const startTime = performance.now();

        const step = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / DURATION, 1);
            // Ease-out cubic: yavaşlayarak dur
            const eased = 1 - Math.pow(1 - t, 3);

            // En kısa yönü hesapla (360° sarmayı doğru yönde geç)
            let diff = target - startFrame;
            if (Math.abs(diff) > totalFrames / 2) {
                diff = diff > 0 ? diff - totalFrames : diff + totalFrames;
            }

            const currentFrame = Math.round(
                ((startFrame + diff * eased) % totalFrames + totalFrames) % totalFrames
            );
            frameRef.current = currentFrame;
            setFrameIndex(currentFrame);

            if (t < 1) {
                animateRafRef.current = requestAnimationFrame(step);
            } else {
                scheduleHotspots();
            }
        };

        animateRafRef.current = requestAnimationFrame(step);
    }, [hideHotspots, scheduleHotspots]);

    // ── Mouse events ────────────────────────────────────────────────────
    const onMouseDown = useCallback((e) => {
        isDragging.current = true;
        lastX.current = e.clientX;
        velocityRef.current = 0;
        cancelAnimationFrame(inertiaRafRef.current);
        hideHotspots();
        e.preventDefault();
    }, [hideHotspots]);

    const onMouseMove = useCallback((e) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastX.current;
        velocityRef.current = dx;
        lastX.current = e.clientX;
        const newIndex = Math.round(
            ((frameRef.current - dx / PX_PER_FRAME) % TOTAL_FRAMES + TOTAL_FRAMES) % TOTAL_FRAMES
        );
        goToFrame(newIndex);
    }, [goToFrame]);

    const onMouseUp = useCallback(() => {
        if (!isDragging.current) return;
        isDragging.current = false;
        startInertia();
    }, [startInertia]);

    // ── Touch events ────────────────────────────────────────────────────
    const onTouchStart = useCallback((e) => {
        isDragging.current = true;
        lastX.current = e.touches[0].clientX;
        velocityRef.current = 0;
        cancelAnimationFrame(inertiaRafRef.current);
        hideHotspots();
    }, [hideHotspots]);

    const onTouchMove = useCallback((e) => {
        if (!isDragging.current) return;
        const dx = e.touches[0].clientX - lastX.current;
        velocityRef.current = dx;
        lastX.current = e.touches[0].clientX;
        const newIndex = Math.round(
            ((frameRef.current - dx / PX_PER_FRAME) % TOTAL_FRAMES + TOTAL_FRAMES) % TOTAL_FRAMES
        );
        goToFrame(newIndex);
        e.preventDefault();
    }, [goToFrame]);

    const onTouchEnd = useCallback(() => {
        if (!isDragging.current) return;
        isDragging.current = false;
        startInertia();
    }, [startInertia]);

    // ── Keyboard ────────────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'ArrowLeft') {
                hideHotspots();
                goToFrame(frameRef.current - 1);
                scheduleHotspots();
            }
            if (e.key === 'ArrowRight') {
                hideHotspots();
                goToFrame(frameRef.current + 1);
                scheduleHotspots();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [goToFrame, hideHotspots, scheduleHotspots]);

    // Show hotspots on initial load
    useEffect(() => {
        if (loadedCount === TOTAL_FRAMES) {
            scheduleHotspots();
        }
    }, [loadedCount, scheduleHotspots]);

    // Cleanup
    useEffect(() => {
        return () => {
            cancelAnimationFrame(inertiaRafRef.current);
            cancelAnimationFrame(animateRafRef.current);
            clearTimeout(hotspotTimerRef.current);
        };
    }, []);

    // ── Calibration click ───────────────────────────────────────────────
    const onCalibrationClick = useCallback((e) => {
        if (!calibrationMode) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width).toFixed(4);
        const y = ((e.clientY - rect.top) / rect.height).toFixed(4);
        const entry = { id: 'APARTMENT_ID', label: 'Daire Adı', x: parseFloat(x), y: parseFloat(y) };
        console.log(`Frame ${frameRef.current} → Hotspot:`, JSON.stringify(entry, null, 2));
        console.log(`JSON için kopyala: "${frameRef.current}": [${JSON.stringify(entry)}]`);
        // Visual flash feedback
        const flash = document.createElement('div');
        flash.style.cssText = `position:fixed;left:${e.clientX - 20}px;top:${e.clientY - 20}px;width:40px;height:40px;border-radius:50%;background:rgba(255,100,0,.6);pointer-events:none;z-index:9999;transition:opacity .5s`;
        document.body.appendChild(flash);
        setTimeout(() => { flash.style.opacity = '0'; }, 50);
        setTimeout(() => flash.remove(), 600);
    }, [calibrationMode]);

    // ── Current hotspots for this frame ────────────────────────────────
    const currentHotspots = hotspots[String(frameIndex)] || [];

    // ── Loading bar ─────────────────────────────────────────────────────
    const loadPercent = Math.round((loadedCount / TOTAL_FRAMES) * 100);
    const isLoading = loadedCount < TOTAL_FRAMES;

    return (
        <div
            ref={containerRef}
            className="viewer-container"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onClick={onCalibrationClick}
            style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
        >
            {/* Loading overlay */}
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

            {/* Main frame image */}
            <img
                ref={imgRef}
                src={frameUrl(frameIndex)}
                className="frame-img"
                alt=""
                draggable={false}
            />

            {/* Hotspot overlay */}
            {showHotspots && currentHotspots.map((hs) => (
                <button
                    key={hs.id}
                    className={`hotspot ${showHotspots ? 'visible' : ''}`}
                    style={{
                        left: `${hs.x * 100}%`,
                        top: `${hs.y * 100}%`,
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onHotspotClick && onHotspotClick(hs.id);
                    }}
                    title={hs.label}
                >
                    <span className="hotspot-dot" />
                    <span className="hotspot-label">{hs.label}</span>
                </button>
            ))}

            {/* Nav arrows */}
            <button className="nav-arrow nav-left"
                onMouseDown={e => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); animateTo(-60); }}>
                ‹
            </button>
            <button className="nav-arrow nav-right"
                onMouseDown={e => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); animateTo(+60); }}>
                ›
            </button>

            {/* Calibration mode banner */}
            {calibrationMode && (
                <div className="calibration-banner">
                    🎯 KALİBRASYON MODU — Bir noktaya tıkla, koordinatlar konsola yazılır (F12)
                </div>
            )}
        </div>
    );
}
