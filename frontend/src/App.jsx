import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import ImageSequenceViewer from './components/ImageSequenceViewer'
import InfoCard from './components/InfoCard'

// URL'de ?calibrate=true varsa kalibrasyon modunu aç
const CALIBRATION_MODE = new URLSearchParams(window.location.search).get('calibrate') === 'true';

function App() {
    const [selectedApartment, setSelectedApartment] = useState(null)
    const [hotspots, setHotspots] = useState({})

    // hotspots.json'ı yükle
    useEffect(() => {
        fetch(import.meta.env.BASE_URL + 'hotspots.json')
            .then(r => r.json())
            .then(data => setHotspots(data))
            .catch(err => console.warn('hotspots.json yüklenemedi:', err))
    }, [])

    const handleHotspotClick = async (id) => {
        if (!id) { setSelectedApartment(null); return; }
        try {
            const response = await axios.get(`/api/apartments/${id}`)
            setSelectedApartment(response.data)
        } catch (error) {
            console.error('Daire verisi alınamadı:', error)
            // Backend yoksa demo veri göster
            setSelectedApartment({
                number: id,
                floor: 1,
                price: 150000,
                status: 'For Sale',
                description: 'Demo daire — backend bağlantısı yok.'
            })
        }
    }

    return (
        <div className="app-container">
            <ImageSequenceViewer
                hotspots={hotspots}
                onHotspotClick={handleHotspotClick}
                calibrationMode={CALIBRATION_MODE}
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
