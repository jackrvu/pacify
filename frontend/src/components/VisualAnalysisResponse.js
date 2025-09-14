import React from 'react';
import './VisualAnalysisResponse.css';
import useTypewriter from '../hooks/useTypewriter';

const VisualAnalysisResponse = ({ analysis, hideSectionTitles = false, enableTypewriter = true }) => {
    // Use typewriter effect for the entire analysis text
    const { displayedText, isTyping, isComplete, skipToEnd } = useTypewriter(
        analysis,
        30, // typing speed in milliseconds
        enableTypewriter
    );

    // Simple markdown-like formatting for **bold** text and ##highlighted## phrases
    const formatMarkdown = (text) => {
        return text
            .replace(/##(.*?)##/g, '<span class="highlighted-phrase">$1</span>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '<br/><br/>')
            .replace(/\n/g, '<br/>');
    };

    const formattedText = formatMarkdown(displayedText);

    return (
        <div className="visual-analysis">
            <div className="analysis-section">
                <div className="section-content">
                    <div
                        className="raw-analysis-content"
                        dangerouslySetInnerHTML={{ __html: formattedText }}
                    />
                </div>
            </div>
        </div>
    );
};

export default VisualAnalysisResponse;
