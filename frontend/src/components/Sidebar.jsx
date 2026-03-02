import { useState, useMemo, useCallback, useEffect } from 'react';
import { DEMO_APARTMENTS } from '../data/apartments';

const STATUS_TABS = ['Tümü', 'Satışta', 'Rezerve', 'Satıldı'];
const BUILDINGS = ['Tümü', 'A Blok', 'B Blok', 'C Blok'];

const STATUS_MAP = {
    'For Sale': 'Satışta',
    'Reserved': 'Rezerve',
    'Sold': 'Satıldı',
};

function statusColor(status) {
    if (status === 'Satışta' || status === 'For Sale') return '#69f0ae';
    if (status === 'Rezerve' || status === 'Reserved') return '#ffab40';
    return '#ff5252';
}

// ── Computed range limits ─────────────────────────────────────────────────────
const ALL_PRICES = DEMO_APARTMENTS.map(a => a.price);
const ALL_SQM = DEMO_APARTMENTS.map(a => a.sqm);
const PRICE_MIN = Math.min(...ALL_PRICES);
const PRICE_MAX = Math.max(...ALL_PRICES);
const SQM_MIN = Math.min(...ALL_SQM);
const SQM_MAX = Math.max(...ALL_SQM);
const FLOOR_MIN = 1;
const FLOOR_MAX = 10;
const ROOMS_MIN = 1;
const ROOMS_MAX = 4;

// ── Range Slider component ────────────────────────────────────────────────────
function RangeSlider({ label, min, max, value, onChange, format }) {
    const [lo, hi] = value;
    const pctLo = ((lo - min) / (max - min)) * 100;
    const pctHi = ((hi - min) / (max - min)) * 100;

    const handleLo = useCallback(e => {
        const v = Number(e.target.value);
        onChange([Math.min(v, hi), hi]);
    }, [hi, onChange]);

    const handleHi = useCallback(e => {
        const v = Number(e.target.value);
        onChange([lo, Math.max(v, lo)]);
    }, [lo, onChange]);

    return (
        <div className="filter-section">
            <div className="filter-label-row">
                <span className="filter-label">{label}</span>
                <span className="filter-value">{format(lo)} – {format(hi)}</span>
            </div>
            <div className="range-slider-wrap">
                <div
                    className="range-track-fill"
                    style={{ left: `${pctLo}%`, width: `${pctHi - pctLo}%` }}
                />
                <input
                    type="range" min={min} max={max} value={lo}
                    className="range-input range-input-lo"
                    onChange={handleLo}
                />
                <input
                    type="range" min={min} max={max} value={hi}
                    className="range-input range-input-hi"
                    onChange={handleHi}
                />
            </div>
        </div>
    );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({ open, onClose, onSelectApartment, externalBuilding, onAvailableCounts }) {
    const apartments = DEMO_APARTMENTS;

    const [activeTab, setActiveTab] = useState('Tümü');
    const [selectedBuilding, setSelectedBuilding] = useState('Tümü');
    const [sortBy, setSortBy] = useState('number');
    const [priceRange, setPriceRange] = useState([PRICE_MIN, PRICE_MAX]);
    const [sqmRange, setSqmRange] = useState([SQM_MIN, SQM_MAX]);
    const [floorRange, setFloorRange] = useState([FLOOR_MIN, FLOOR_MAX]);
    const [roomsRange, setRoomsRange] = useState([ROOMS_MIN, ROOMS_MAX]);
    const [showFilters, setShowFilters] = useState(() => window.innerWidth > 640);

    // Dışarıdan bina seçimi gelirse uygula
    useEffect(() => {
        if (externalBuilding && externalBuilding !== 'Tümü') {
            setSelectedBuilding(externalBuilding);
        }
    }, [externalBuilding]);

    const fmtPrice = v => new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(v) + ' ₺';
    const fmtSqm = v => `${v} m²`;
    const fmtFloor = v => `${v}. kat`;
    const fmtRooms = v => `1+${v}`;

    const filtered = useMemo(() => {
        return apartments
            .filter(a => {
                const st = STATUS_MAP[a.status] || a.status;
                if (activeTab !== 'Tümü' && st !== activeTab) return false;
                if (selectedBuilding !== 'Tümü' && a.building !== selectedBuilding) return false;
                if (a.price < priceRange[0] || a.price > priceRange[1]) return false;
                if (a.sqm < sqmRange[0] || a.sqm > sqmRange[1]) return false;
                if (a.floor < floorRange[0] || a.floor > floorRange[1]) return false;
                if (a.rooms < roomsRange[0] || a.rooms > roomsRange[1]) return false;
                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'price_asc') return a.price - b.price;
                if (sortBy === 'price_desc') return b.price - a.price;
                if (sortBy === 'floor') return a.floor - b.floor;
                return a.number.localeCompare(b.number);
            });
    }, [apartments, activeTab, selectedBuilding, priceRange, sqmRange, floorRange, roomsRange, sortBy]);

    const counts = useMemo(() => ({
        'Tümü': apartments.length,
        'Satışta': apartments.filter(a => (STATUS_MAP[a.status] || a.status) === 'Satışta').length,
        'Rezerve': apartments.filter(a => (STATUS_MAP[a.status] || a.status) === 'Rezerve').length,
        'Satıldı': apartments.filter(a => (STATUS_MAP[a.status] || a.status) === 'Satıldı').length,
    }), [apartments]);

    // Filtre değişince bina başına satışta kalan sayısını dışarı bildir
    useEffect(() => {
        if (!onAvailableCounts) return;
        // Tüm filtreleri uygula ama status filtresi olmadan (sadece slider + bina filtresi)
        // çünkü tooltip her zaman "Satışta" olanları göstermeli
        const availableFiltered = apartments.filter(a => {
            const st = STATUS_MAP[a.status] || a.status;
            if (st !== 'Satışta') return false;
            if (selectedBuilding !== 'Tümü' && a.building !== selectedBuilding) return false;
            if (a.price < priceRange[0] || a.price > priceRange[1]) return false;
            if (a.sqm < sqmRange[0] || a.sqm > sqmRange[1]) return false;
            if (a.floor < floorRange[0] || a.floor > floorRange[1]) return false;
            if (a.rooms < roomsRange[0] || a.rooms > roomsRange[1]) return false;
            return true;
        });
        const byCounts = {};
        ['A Blok', 'B Blok', 'C Blok'].forEach(b => {
            byCounts[b] = availableFiltered.filter(a => a.building === b).length;
        });
        onAvailableCounts(byCounts);
    }, [apartments, selectedBuilding, priceRange, sqmRange, floorRange, roomsRange, onAvailableCounts]);

    return (
        <>
            {/* Toggle butonu */}
            {!open && (
                <button className="sidebar-toggle-btn" onClick={() => onClose(true)}>
                    <span className="sidebar-toggle-icon">☰</span>
                    <span className="sidebar-toggle-label">Daireler</span>
                </button>
            )}

            <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>

                {/* Header */}
                <div className="sidebar-header">
                    <span className="sidebar-title">🏢 Daire Listesi</span>
                    <button className="sidebar-close-btn" onClick={() => onClose(false)}>✕</button>
                </div>

                {/* Bina seçici */}
                <div className="bina-selector-wrap">
                    {BUILDINGS.map(b => (
                        <button
                            key={b}
                            className={`bina-btn ${selectedBuilding === b ? 'bina-btn--active' : ''}`}
                            onClick={() => setSelectedBuilding(b)}
                        >
                            {b === 'Tümü' ? 'Tümü' : b.replace(' Blok', '')}
                        </button>
                    ))}
                </div>

                {/* Durum sekmeleri */}
                <div className="sidebar-tabs">
                    {STATUS_TABS.map(tab => (
                        <button
                            key={tab}
                            className={`sidebar-tab ${activeTab === tab ? 'sidebar-tab--active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                            <span className="sidebar-tab-count">{counts[tab]}</span>
                        </button>
                    ))}
                </div>

                {/* Filtreler toggle */}
                <button
                    className="filter-toggle-btn"
                    onClick={() => setShowFilters(v => !v)}
                >
                    <span>🔍 Gelişmiş Filtreler</span>
                    <span className={`filter-chevron ${showFilters ? 'filter-chevron--open' : ''}`}>›</span>
                </button>

                {/* Range sliders */}
                {showFilters && (
                    <div className="filters-panel">
                        <RangeSlider
                            label="Alan"
                            min={SQM_MIN} max={SQM_MAX}
                            value={sqmRange}
                            onChange={setSqmRange}
                            format={fmtSqm}
                        />
                        <RangeSlider
                            label="Oda Sayısı"
                            min={ROOMS_MIN} max={ROOMS_MAX}
                            value={roomsRange}
                            onChange={setRoomsRange}
                            format={fmtRooms}
                        />
                        <RangeSlider
                            label="Kat"
                            min={FLOOR_MIN} max={FLOOR_MAX}
                            value={floorRange}
                            onChange={setFloorRange}
                            format={fmtFloor}
                        />
                        <RangeSlider
                            label="Fiyat"
                            min={PRICE_MIN} max={PRICE_MAX}
                            value={priceRange}
                            onChange={setPriceRange}
                            format={fmtPrice}
                        />
                    </div>
                )}

                {/* Sıralama + sonuç sayısı */}
                <div className="sidebar-sort-row">
                    <span className="sidebar-result-count">{filtered.length} sonuç</span>
                    <select
                        className="sidebar-sort"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                    >
                        <option value="number">Ad: A→Z</option>
                        <option value="price_asc">Fiyat ↑</option>
                        <option value="price_desc">Fiyat ↓</option>
                        <option value="floor">Kat</option>
                    </select>
                </div>

                {/* Liste */}
                <div className="sidebar-list">
                    {filtered.length === 0 && (
                        <div className="sidebar-empty">Sonuç bulunamadı</div>
                    )}
                    {filtered.map(apt => {
                        const st = STATUS_MAP[apt.status] || apt.status;
                        return (
                            <div
                                key={apt.id}
                                className="apt-card"
                                onClick={() => onSelectApartment(apt)}
                            >
                                <div className="apt-card-top">
                                    <span className="apt-card-number">{apt.number}</span>
                                    <span
                                        className="apt-card-status"
                                        style={{
                                            color: statusColor(st),
                                            borderColor: statusColor(st) + '55',
                                            background: statusColor(st) + '18',
                                        }}
                                    >
                                        {st}
                                    </span>
                                </div>
                                <div className="apt-card-meta">
                                    <span className="apt-meta-tag">🏷 1+{apt.rooms}</span>
                                    <span className="apt-meta-tag">📐 {apt.sqm} m²</span>
                                    <span className="apt-meta-tag">🏢 Kat {apt.floor}</span>
                                </div>
                                <div className="apt-card-details">
                                    <span className="apt-card-building">{apt.building}</span>
                                    <span className="apt-card-price">
                                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(apt.price)}
                                    </span>
                                </div>
                                {apt.description && (
                                    <p className="apt-card-desc">{apt.description}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </aside>
        </>
    );
}
