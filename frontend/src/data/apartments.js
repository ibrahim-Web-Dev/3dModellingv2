// Ortak daire verileri — Sidebar ve BuildingTooltip tarafından import edilir

export const DEMO_APARTMENTS = [
    // A BLOK
    { id: 1, number: 'A-101', building: 'A Blok', floor: 1, rooms: 1, sqm: 65, price: 2400000, status: 'For Sale', description: 'Giriş kat, bahçe cepheli' },
    { id: 2, number: 'A-201', building: 'A Blok', floor: 2, rooms: 2, sqm: 85, price: 2850000, status: 'For Sale', description: 'Ferah oturma odası, geniş balkon' },
    { id: 3, number: 'A-301', building: 'A Blok', floor: 3, rooms: 1, sqm: 68, price: 2620000, status: 'For Sale', description: 'Şehir manzarası, güney cephe' },
    { id: 4, number: 'A-401', building: 'A Blok', floor: 4, rooms: 3, sqm: 108, price: 3750000, status: 'Reserved', description: 'Köşe daire, çift cepheli' },
    { id: 5, number: 'A-501', building: 'A Blok', floor: 5, rooms: 2, sqm: 90, price: 3100000, status: 'For Sale', description: 'Panoramik manzara, açık mutfak' },
    { id: 6, number: 'A-601', building: 'A Blok', floor: 6, rooms: 4, sqm: 130, price: 4800000, status: 'For Sale', description: 'Geniş aile dairesi, iki banyo' },
    { id: 7, number: 'A-701', building: 'A Blok', floor: 7, rooms: 2, sqm: 88, price: 3250000, status: 'For Sale', description: 'Yüksek kat, hava akımlı' },
    { id: 8, number: 'A-801', building: 'A Blok', floor: 8, rooms: 3, sqm: 112, price: 4100000, status: 'For Sale', description: 'Şehir panoraması, ebeveyn banyolu' },
    { id: 9, number: 'A-901', building: 'A Blok', floor: 9, rooms: 4, sqm: 125, price: 5100000, status: 'Sold', description: 'Penthouse katı altı, çift teras' },
    { id: 10, number: 'A-1001', building: 'A Blok', floor: 10, rooms: 4, sqm: 135, price: 5500000, status: 'For Sale', description: 'Teras daire, 360° manzara' },

    // B BLOK
    { id: 11, number: 'B-101', building: 'B Blok', floor: 1, rooms: 1, sqm: 55, price: 1800000, status: 'For Sale', description: 'Bahçe katı, özel yeşil alan' },
    { id: 12, number: 'B-201', building: 'B Blok', floor: 2, rooms: 2, sqm: 78, price: 2300000, status: 'For Sale', description: 'Park manzarası, doğu cephe' },
    { id: 13, number: 'B-301', building: 'B Blok', floor: 3, rooms: 1, sqm: 60, price: 1950000, status: 'For Sale', description: 'Kompakt dizayn, merkezi konum' },
    { id: 14, number: 'B-401', building: 'B Blok', floor: 4, rooms: 3, sqm: 98, price: 3200000, status: 'Reserved', description: 'Aile tipi, geniş salon' },
    { id: 15, number: 'B-501', building: 'B Blok', floor: 5, rooms: 2, sqm: 82, price: 2600000, status: 'For Sale', description: 'Güneş alan cephe, balkonlu' },
    { id: 16, number: 'B-601', building: 'B Blok', floor: 6, rooms: 4, sqm: 118, price: 4100000, status: 'For Sale', description: 'Çift banyo, büyük ebeveyn odası' },
    { id: 17, number: 'B-701', building: 'B Blok', floor: 7, rooms: 2, sqm: 80, price: 2750000, status: 'For Sale', description: 'Yüksek tavan, minimalist iç tasarım' },
    { id: 18, number: 'B-801', building: 'B Blok', floor: 8, rooms: 3, sqm: 102, price: 3600000, status: 'For Sale', description: 'Panoramik şehir manzarası' },
    { id: 19, number: 'B-901', building: 'B Blok', floor: 9, rooms: 4, sqm: 115, price: 4400000, status: 'For Sale', description: 'Çatı katı altı, çift teras' },
    { id: 20, number: 'B-1001', building: 'B Blok', floor: 10, rooms: 3, sqm: 120, price: 4500000, status: 'Sold', description: 'En üst kat, teras ve çatı bahçe' },

    // C BLOK
    { id: 21, number: 'C-101', building: 'C Blok', floor: 1, rooms: 1, sqm: 50, price: 1500000, status: 'For Sale', description: 'Sosyal tesis girişine yakın' },
    { id: 22, number: 'C-201', building: 'C Blok', floor: 2, rooms: 2, sqm: 72, price: 2050000, status: 'For Sale', description: 'Havuz cepheli, güney veranda' },
    { id: 23, number: 'C-301', building: 'C Blok', floor: 3, rooms: 1, sqm: 55, price: 1720000, status: 'For Sale', description: 'Huzurlu iç avlu manzarası' },
    { id: 24, number: 'C-401', building: 'C Blok', floor: 4, rooms: 3, sqm: 92, price: 2900000, status: 'Reserved', description: 'Üç oda, geniş mutfak' },
    { id: 25, number: 'C-501', building: 'C Blok', floor: 5, rooms: 2, sqm: 76, price: 2350000, status: 'For Sale', description: 'Orta kat, her yönden ışık' },
    { id: 26, number: 'C-601', building: 'C Blok', floor: 6, rooms: 4, sqm: 108, price: 3600000, status: 'For Sale', description: 'Büyük aile dairesi, iki balkon' },
    { id: 27, number: 'C-701', building: 'C Blok', floor: 7, rooms: 2, sqm: 78, price: 2500000, status: 'For Sale', description: 'Kuzey-güney çift cephe' },
    { id: 28, number: 'C-801', building: 'C Blok', floor: 8, rooms: 3, sqm: 95, price: 3150000, status: 'For Sale', description: 'Şehir silueti manzarası' },
    { id: 29, number: 'C-901', building: 'C Blok', floor: 9, rooms: 4, sqm: 110, price: 3850000, status: 'Sold', description: 'Yüksek kat, teras balkon' },
    { id: 30, number: 'C-1001', building: 'C Blok', floor: 10, rooms: 3, sqm: 105, price: 4000000, status: 'For Sale', description: 'Teras daire, yeşil çatı' },
];
