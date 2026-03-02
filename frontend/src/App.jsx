// Version 2026-03-02-13:54
import { useState, useEffect } from 'react'
import './App.css'
import ImageSequenceViewer from './components/ImageSequenceViewer'
import InfoCard from './components/InfoCard'
import Sidebar from './components/Sidebar'

const CALIBRATION_MODE = new URLSearchParams(window.location.search).get('calibrate') === 'true';

const ID_TO_BUILDING = {
    A_BLOK: 'A Blok',
    B_BLOK: 'B Blok',
    C_BLOK: 'C Blok',
};

function App() {
    const [selectedApartment, setSelectedApartment] = useState(null)
    const [hotspots, setHotspots] = useState({})
    const [buildingData, setBuildingData] = useState({})
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarBuilding, setSidebarBuilding] = useState('Tümü')
    const [availableCounts, setAvailableCounts] = useState({})

    useEffect(() => {
        fetch(import.meta.env.BASE_URL + 'hotspots.json')
            .then(r => r.json())
            .then(data => setHotspots(data))
            .catch(err => console.warn('hotspots.json yüklenemedi:', err))
    }, [])

    useEffect(() => {
        fetch(import.meta.env.BASE_URL + 'buildingData.json')
            .then(r => r.json())
            .then(data => setBuildingData(data))
            .catch(err => console.warn('buildingData.json yüklenemedi:', err))
    }, [])

    const handleBuildingClick = (building) => {
        const bloqName = ID_TO_BUILDING[building.id] || 'Tümü';
        setSidebarBuilding(bloqName);
        setSidebarOpen(true);
    }

    return (
        <div className="app-container">
            <ImageSequenceViewer
                hotspots={hotspots}
                calibrationMode={CALIBRATION_MODE}
                buildingData={buildingData}
                onBuildingClick={handleBuildingClick}
                availableCounts={availableCounts}
            />

            <Sidebar
                open={sidebarOpen}
                onClose={setSidebarOpen}
                onSelectApartment={setSelectedApartment}
                externalBuilding={sidebarBuilding}
                onAvailableCounts={setAvailableCounts}
            />

            {selectedApartment && (
                <InfoCard
                    apartment={selectedApartment}
                    onClose={() => setSelectedApartment(null)}
                />
            )}
        </div>
    )
}

export default App
