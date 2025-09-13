import React, { useState, useEffect } from 'react';
import './PolicyModal.css';
import { bookmarkPolicy, unbookmarkPolicy, isPolicyBookmarked, addAnnotation } from '../utils/bookmarkService';
import { analyzePolicyWithGemini, getPolicyInsights, isGeminiAvailable } from '../utils/geminiService';
import PolicyIncidentGraph from './PolicyIncidentGraph';
import VisualAnalysisResponse from './VisualAnalysisResponse';

const PolicyModal = ({
    isOpen,
    onClose,
    policy,
    year,
    timelineData = []
}) => {
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showAnnotations, setShowAnnotations] = useState(false);
    const [newAnnotation, setNewAnnotation] = useState('');
    const [annotationType, setAnnotationType] = useState('note');
    const [geminiLoading, setGeminiLoading] = useState(false);
    const [geminiResponse, setGeminiResponse] = useState('');
    const [showGeminiPanel, setShowGeminiPanel] = useState(false);
    const [geminiQuestion, setGeminiQuestion] = useState('');
    const [currentAnalysisType, setCurrentAnalysisType] = useState(null);

    // Check if policy is bookmarked when modal opens
    useEffect(() => {
        if (isOpen && policy) {
            setIsBookmarked(isPolicyBookmarked(policy.law_id || policy['Law ID']));
        }
    }, [isOpen, policy]);

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

    // Bookmark handlers
    const handleBookmark = () => {
        const policyData = {
            law_id: policy.law_id || policy['Law ID'],
            state: policy.state || policy.State,
            law_class: policy.law_class || policy['Law Class'],
            effect: policy.effect || policy.Effect,
            effective_date: policy.effective_date || `${policy['Effective Date Year']}-${policy['Effective Date Month']}-${policy['Effective Date Day']}`,
            original_content: policy.original_content || policy.Content,
            human_explanation: policy.human_explanation || policy['Additional Context and Notes'],
            mass_shooting_analysis: policy.mass_shooting_analysis,
            state_mass_shooting_stats: policy.state_mass_shooting_stats
        };

        const result = bookmarkPolicy(policyData);
        if (result.success) {
            setIsBookmarked(true);
        } else {
            alert(result.message);
        }
    };

    const handleUnbookmark = () => {
        const result = unbookmarkPolicy(policy.law_id || policy['Law ID']);
        if (result.success) {
            setIsBookmarked(false);
        } else {
            alert(result.message);
        }
    };

    // Annotation handlers
    const handleAddAnnotation = () => {
        if (!newAnnotation.trim()) return;

        const result = addAnnotation(policy.law_id || policy['Law ID'], {
            content: newAnnotation,
            type: annotationType,
            gemini_response: geminiResponse || null
        });

        if (result.success) {
            setNewAnnotation('');
            setGeminiResponse('');
            alert('Annotation added successfully!');
        } else {
            alert(result.message);
        }
    };

    // Get analysis title based on insight type
    const getAnalysisTitle = (insightType) => {
        const titles = {
            'safety_impact': '🛡️ Safety Impact Analysis',
            'constitutional': '⚖️ Constitutional Analysis',
            'effectiveness': '📊 Policy Effectiveness Analysis',
            'comparison': '🔄 State Comparison Analysis',
            'unintended': '⚠️ Unintended Consequences Analysis',
            'implementation': '🔧 Implementation Challenges Analysis'
        };
        return titles[insightType] || '🤖 AI Analysis';
    };

    // Gemini handlers
    const handleGeminiAnalysis = async (insightType = null) => {
        if (!isGeminiAvailable()) {
            alert('Gemini API is not configured. Please set up your API key to use AI analysis.');
            return;
        }

        setGeminiLoading(true);
        setGeminiResponse('');
        setCurrentAnalysisType(insightType);

        try {
            const policyData = {
                law_id: policy.law_id || policy['Law ID'],
                state: policy.state || policy.State,
                law_class: policy.law_class || policy['Law Class'],
                effect: policy.effect || policy.Effect,
                effective_date: policy.effective_date || `${policy['Effective Date Year']}-${policy['Effective Date Month']}-${policy['Effective Date Day']}`,
                original_content: policy.original_content || policy.Content,
                human_explanation: policy.human_explanation || policy['Additional Context and Notes'],
                mass_shooting_analysis: policy.mass_shooting_analysis,
                state_mass_shooting_stats: policy.state_mass_shooting_stats
            };

            const result = insightType
                ? await getPolicyInsights(policyData, insightType)
                : await analyzePolicyWithGemini(policyData, geminiQuestion || null);

            if (result.success) {
                setGeminiResponse(result.analysis);
            } else {
                alert(result.message);
            }
        } catch (error) {
            alert('Failed to analyze policy: ' + error.message);
        } finally {
            setGeminiLoading(false);
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
                    <div className="policy-modal-actions">
                        <button
                            className={`bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
                            onClick={isBookmarked ? handleUnbookmark : handleBookmark}
                            title={isBookmarked ? 'Remove bookmark' : 'Bookmark policy'}
                        >
                            {isBookmarked ? '★' : '☆'}
                        </button>
                        <button
                            className="policy-modal-close"
                            onClick={onClose}
                            aria-label="Close policy details"
                        >
                            ×
                        </button>
                    </div>
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

                {/* Bookmark Controls */}
                {isBookmarked && (
                    <div className="bookmark-controls">
                        <div className="bookmark-controls-header">
                            <h3>📚 Bookmarked Policy</h3>
                            <div className="bookmark-controls-buttons">
                                <button
                                    className={`control-btn ${showAnnotations ? 'active' : ''}`}
                                    onClick={() => setShowAnnotations(!showAnnotations)}
                                >
                                    Annotations
                                </button>
                                <button
                                    className={`control-btn ${showGeminiPanel ? 'active' : ''}`}
                                    onClick={() => setShowGeminiPanel(!showGeminiPanel)}
                                >
                                    AI Analysis
                                </button>
                            </div>
                        </div>

                        {/* Annotations Panel */}
                        {showAnnotations && (
                            <div className="annotations-panel">
                                <div className="annotation-input">
                                    <select
                                        value={annotationType}
                                        onChange={(e) => setAnnotationType(e.target.value)}
                                        className="annotation-type-select"
                                    >
                                        <option value="note">📝 Note</option>
                                        <option value="question">❓ Question</option>
                                        <option value="insight">💡 Insight</option>
                                    </select>
                                    <textarea
                                        value={newAnnotation}
                                        onChange={(e) => setNewAnnotation(e.target.value)}
                                        placeholder="Add your annotation..."
                                        className="annotation-textarea"
                                        rows="3"
                                    />
                                    <button
                                        onClick={handleAddAnnotation}
                                        className="add-annotation-btn"
                                        disabled={!newAnnotation.trim()}
                                    >
                                        Add Annotation
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Gemini Analysis Panel */}
                        {showGeminiPanel && (
                            <div className="gemini-panel">
                                <div className="gemini-controls">
                                    <div className="gemini-quick-actions">
                                        <button
                                            onClick={() => handleGeminiAnalysis('safety_impact')}
                                            disabled={geminiLoading}
                                            className="gemini-btn"
                                        >
                                            🛡️ Safety Impact
                                        </button>
                                        <button
                                            onClick={() => handleGeminiAnalysis('constitutional')}
                                            disabled={geminiLoading}
                                            className="gemini-btn"
                                        >
                                            ⚖️ Constitutional
                                        </button>
                                        <button
                                            onClick={() => handleGeminiAnalysis('effectiveness')}
                                            disabled={geminiLoading}
                                            className="gemini-btn"
                                        >
                                            📊 Effectiveness
                                        </button>
                                    </div>
                                    <div className="gemini-custom-question">
                                        <input
                                            type="text"
                                            value={geminiQuestion}
                                            onChange={(e) => setGeminiQuestion(e.target.value)}
                                            placeholder="Ask a specific question about this policy..."
                                            className="gemini-question-input"
                                        />
                                        <button
                                            onClick={() => handleGeminiAnalysis()}
                                            disabled={geminiLoading || !geminiQuestion.trim()}
                                            className="gemini-ask-btn"
                                        >
                                            {geminiLoading ? '⏳ Analyzing...' : '🤖 Ask Gemini'}
                                        </button>
                                    </div>
                                </div>

                                {geminiResponse && (
                                    <div className="gemini-response">
                                        <h4>{getAnalysisTitle(currentAnalysisType)}</h4>
                                        <div className="gemini-response-content">
                                            <VisualAnalysisResponse 
                                                analysis={geminiResponse} 
                                                hideSectionTitles={currentAnalysisType !== null}
                                                enableTypewriter={true}
                                            />
                                        </div>
                                        <button
                                            onClick={() => setGeminiResponse('')}
                                            className="clear-response-btn"
                                        >
                                            Clear Response
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Policy Incident Graph */}
                {policy && (
                    <div className="policy-modal-graph-section">
                        <PolicyIncidentGraph
                            state={policy.State || policy.state}
                            policyDate={policy.effective_date || `${policy['Effective Date Year']}-${policy['Effective Date Month']}-${policy['Effective Date Day']}`}
                            timelineData={timelineData}
                        />
                    </div>
                )}

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
