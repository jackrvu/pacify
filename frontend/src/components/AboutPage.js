import React from 'react';
import { useNavigate } from 'react-router-dom';

const AboutPage = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
            background: '#ffffff',
            overflow: 'auto'
        }}>
            {/* Back Button */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                zIndex: 10000,
                background: '#ff6b35',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}
                className="back-to-map-button"
                onClick={() => navigate('/')}>
                ← Back to Map
            </div>

            <iframe
                src="/about.html"
                style={{
                    width: '100%',
                    height: '100%',
                    border: 'none'
                }}
                title="About Page"
            />
        </div>
    );
};

export default AboutPage;
