import React from 'react';

const InfoCard = ({ apartment, onClose }) => {
    if (!apartment) return null;

    return (
        <div className="info-card">
            <button className="close-btn" onClick={onClose}>×</button>
            <h2>Daire {apartment.number}</h2>
            <div className="info-row">
                <span>Kat:</span>
                <strong>{apartment.floor}</strong>
            </div>
            <div className="info-row">
                <span>Fiyat:</span>
                <strong>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(apartment.price)}</strong>
            </div>
            <div className="info-row">
                <span>Durum:</span>
                <strong className={`status ${apartment.status === 'For Sale' ? 'for-sale' : 'sold'}`}>
                    {apartment.status}
                </strong>
            </div>
            <p className="description">{apartment.description}</p>
        </div>
    );
};

export default InfoCard;
