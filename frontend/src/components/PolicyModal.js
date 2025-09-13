import React from 'react';
import './PolicyModal.css';

const PolicyModal = ({
    isOpen,
    onClose,
    policy,
    year
}) => {
    if (!isOpen || !policy) return null;

    const formatPolicyDate = (year, month, day) => {
        if (!year) return 'Unknown Date';

        const date = new Date(year, (month || 1) - 1, day || 1);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getPolicyEffectColor = (effect) => {
        if (!effect) return '#666';
        switch (effect.toLowerCase()) {
            case 'restrictive':
                return '#DC143C'; // Crimson
            case 'permissive':
                return '#228B22'; // Forest Green
            default:
                return '#666'; // Gray
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="policy-modal-overlay" onClick={handleOverlayClick}>
            <div className="policy-modal">
                <div className="policy-modal-header">
                    <div className="policy-modal-title">
                        <h2>{policy['Law Class'] || 'Gun Policy Details'}</h2>
                        <div className="policy-meta">
                            <span className="policy-state">{policy.State}</span>
                            <span
                                className="policy-effect-badge"
                                style={{
                                    backgroundColor: getPolicyEffectColor(policy.Effect),
                                    color: 'white'
                                }}
                            >
                                {policy.Effect || 'Unknown Effect'}
                            </span>
                        </div>
                    </div>
                    <button
                        className="policy-modal-close"
                        onClick={onClose}
                        aria-label="Close policy details"
                    >
                        ×
                    </button>
                </div>

                <div className="policy-modal-content">
                    <div className="policy-info-grid">
                        <div className="policy-info-item">
                            <label>Effective Date</label>
                            <div className="policy-info-value">
                                {formatPolicyDate(
                                    policy['Effective Date Year'],
                                    policy['Effective Date Month'],
                                    policy['Effective Date Day']
                                )}
                            </div>
                        </div>

                        <div className="policy-info-item">
                            <label>Law Class</label>
                            <div className="policy-info-value">
                                {policy['Law Class'] || 'Not specified'}
                            </div>
                        </div>

                        {policy['Law Class Subtype'] && (
                            <div className="policy-info-item">
                                <label>Subtype</label>
                                <div className="policy-info-value">
                                    {policy['Law Class Subtype']}
                                </div>
                            </div>
                        )}

                        <div className="policy-info-item">
                            <label>Type of Change</label>
                            <div className="policy-info-value">
                                {policy['Type of Change'] || 'Not specified'}
                            </div>
                        </div>

                        {policy['Handguns or Long Guns'] && (
                            <div className="policy-info-item">
                                <label>Applies to</label>
                                <div className="policy-info-value">
                                    {policy['Handguns or Long Guns']}
                                </div>
                            </div>
                        )}

                        {policy['Statutory Citation'] && (
                            <div className="policy-info-item">
                                <label>Statutory Citation</label>
                                <div className="policy-info-value policy-citation">
                                    {policy['Statutory Citation']}
                                </div>
                            </div>
                        )}

                        {policy['Law ID'] && (
                            <div className="policy-info-item">
                                <label>Law ID</label>
                                <div className="policy-info-value">
                                    {policy['Law ID']}
                                </div>
                            </div>
                        )}
                    </div>

                    {policy.Content && (
                        <div className="policy-content-section">
                            <h3>Policy Content</h3>
                            <div className="policy-content-text">
                                {policy.Content}
                            </div>
                        </div>
                    )}

                    {policy['Additional Context and Notes'] && (
                        <div className="policy-notes-section">
                            <h3>Additional Context</h3>
                            <div className="policy-notes-text">
                                {policy['Additional Context and Notes']}
                            </div>
                        </div>
                    )}

                    {policy['Effective Date Note'] && (
                        <div className="policy-date-note-section">
                            <h3>Date Notes</h3>
                            <div className="policy-date-note-text">
                                {policy['Effective Date Note']}
                            </div>
                        </div>
                    )}

                    {(policy['Supersession Date Year'] ||
                        policy['Supersession Date Month'] ||
                        policy['Supersession Date Day']) && (
                            <div className="policy-supersession-section">
                                <h3>Supersession Information</h3>
                                <div className="policy-supersession-text">
                                    Superseded on: {formatPolicyDate(
                                        policy['Supersession Date Year'],
                                        policy['Supersession Date Month'],
                                        policy['Supersession Date Day']
                                    )}
                                </div>
                            </div>
                        )}
                </div>

                <div className="policy-modal-footer">
                    <button
                        className="policy-modal-close-btn"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PolicyModal;
