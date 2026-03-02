import { DEMO_APARTMENTS } from '../data/apartments';

const ID_TO_BUILDING = {
    A_BLOK: 'A Blok',
    B_BLOK: 'B Blok',
    C_BLOK: 'C Blok',
};

export default function BuildingTooltip({ building, mouseX, mouseY, availableCounts = {}, onClick }) {
    if (!building) return null;

    const OFFSET_X = 18;
    const OFFSET_Y = -12;
    const WIDTH = 260;

    const left = Math.min(mouseX + OFFSET_X, window.innerWidth - WIDTH - 16);
    const top = Math.max(mouseY + OFFSET_Y - 140, 8);

    const buildingName = ID_TO_BUILDING[building.id] || null;

    // Sidebar filtre sayacı varsa onu kullan, yoksa statik hesapla
    let availableCount = null;
    let totalCount = null;
    if (buildingName) {
        totalCount = DEMO_APARTMENTS.filter(a => a.building === buildingName).length;
        availableCount = availableCounts[buildingName] !== undefined
            ? availableCounts[buildingName]
            : DEMO_APARTMENTS.filter(a => a.building === buildingName && (a.status === 'For Sale' || a.status === 'Satışta')).length;
    }

    const availColor =
        availableCount === 0 ? '#f44336' :
            availableCount <= 3 ? '#ff9800' : '#69f0ae';

    return (
        <div
            className="building-tooltip"
            style={{ left, top, width: WIDTH, cursor: onClick ? 'pointer' : 'default', zIndex: 300 }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); if (onClick) onClick(building); }}
        >
            <div className="bt-header">
                <span className="bt-name">{building.name}</span>
                <span
                    className="bt-status"
                    style={{
                        background: building.status === 'Teslim Edildi'
                            ? 'rgba(76,175,80,0.18)' : 'rgba(232,184,93,0.15)',
                        color: building.status === 'Teslim Edildi' ? '#66bb6a' : '#f0d080',
                        border: `1px solid ${building.status === 'Teslim Edildi'
                            ? 'rgba(76,175,80,0.4)' : 'rgba(232,184,93,0.35)'}`,
                    }}
                >
                    {building.status}
                </span>
            </div>

            {availableCount !== null && (
                <div className="bt-progress-wrap">
                    <div className="bt-progress-label">
                        <span>Müsait Daire</span>
                        <span style={{ color: availColor, fontWeight: 700 }}>
                            {availableCount === 0 ? 'Tükenmiş' : `${availableCount} daire kaldı`}
                        </span>
                    </div>
                    <div className="bt-progress-track">
                        <div
                            className="bt-progress-fill"
                            style={{
                                width: `${totalCount ? (availableCount / totalCount) * 100 : 0}%`,
                                background: availColor,
                            }}
                        />
                    </div>
                </div>
            )}

            <div className="bt-row">
                <span>Kat Sayısı</span>
                <strong>{building.floors} Kat</strong>
            </div>

            <p className="bt-desc">{building.description}</p>
            <div className="bt-hint">Detay için tıklayın →</div>
        </div>
    );
}
