import React from 'react';
import './VisualAnalysisResponse.css';
import useTypewriter from '../hooks/useTypewriter';

const VisualAnalysisResponse = ({ analysis, hideSectionTitles = false, enableTypewriter = true }) => {
    // Function to parse text and convert **text** to bold
    const parseTextWithBold = (text) => {
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                const boldText = part.slice(2, -2); // Remove ** from start and end
                return <strong key={index} className="bold-text">{boldText}</strong>;
            }
            return part;
        });
    };
    const parseAnalysis = (text) => {
        // Check if it's already structured with ## headers
        if (text.includes('##')) {
            const sections = text.split(/##\s+/);
            const parsed = {};
            
            sections.forEach(section => {
                if (section.trim()) {
                    const lines = section.split('\n');
                    const title = lines[0].trim();
                    const content = lines.slice(1).join('\n').trim();
                    
                    if (title && content && content.length > 10) {
                        parsed[title] = content;
                    }
                }
            });
            
            return parsed;
        } else {
            // Check if this is a focused single-topic response
            // If it doesn't contain multiple section markers, treat it as a single focused response
            const hasMultipleSections = text.includes('Potential Benefits:') || 
                                       text.includes('Potential Drawbacks:') || 
                                       text.includes('Constitutional') ||
                                       text.includes('Safety Impact') ||
                                       text.includes('State Context');
            
            if (!hasMultipleSections) {
                // This is a focused response, return it as a single section
                return { 'Focused Analysis': text };
            } else {
                // Fallback: parse unstructured text and organize it
                return parseUnstructuredText(text);
            }
        }
    };

    const parseUnstructuredText = (text) => {
        const sections = {};
        const usedRanges = []; // Track used text ranges to avoid overlaps
        
        // Helper function to check if a range overlaps with used ranges
        const hasOverlap = (start, end) => {
            return usedRanges.some(range => 
                (start >= range.start && start <= range.end) ||
                (end >= range.start && end <= range.end) ||
                (start <= range.start && end >= range.end)
            );
        };
        
        // Helper function to mark a range as used
        const markUsed = (start, end) => {
            usedRanges.push({ start, end });
        };
        
        // Look for structured sections first (these are most reliable)
        const structuredSections = [
            { markers: ['Potential Benefits:', '**Potential Benefits:**'], title: 'Safety Benefits' },
            { markers: ['Potential Drawbacks:', '**Potential Drawbacks:**'], title: 'Safety Concerns' },
            { markers: ['Overall Assessment:', '**Overall Assessment:**'], title: 'Key Takeaways' }
        ];
        
        structuredSections.forEach(section => {
            const content = extractSection(text, section.markers);
            if (content && content.length > 20) {
                sections[section.title] = content;
                // Mark this content as used
                const startIndex = text.indexOf(content);
                if (startIndex !== -1) {
                    markUsed(startIndex, startIndex + content.length);
                }
            }
        });
        
        // If we have structured sections, organize the remaining content
        if (Object.keys(sections).length > 0) {
            // Get all unused text
            const unusedText = getUnusedText(text, usedRanges);
            if (unusedText.length > 100) {
                // Try to organize the remaining text
                const organizedRemaining = organizeRemainingText(unusedText);
                Object.assign(sections, organizedRemaining);
            }
        } else {
            // No structured sections found, try to organize the entire text
            const organizedText = organizeEntireText(text);
            Object.assign(sections, organizedText);
        }
        
        return sections;
    };

    const extractSection = (text, markers) => {
        for (const marker of markers) {
            const startIndex = text.indexOf(marker);
            if (startIndex !== -1) {
                const sectionStart = startIndex + marker.length;
                const nextSection = findNextSection(text, sectionStart);
                const sectionEnd = nextSection !== -1 ? nextSection : text.length;
                
                let content = text.substring(sectionStart, sectionEnd).trim();
                
                // Clean up the content
                content = content.replace(/\*\*/g, ''); // Remove bold markers
                content = content.replace(/\*/g, '•'); // Convert asterisks to bullets
                
                return content;
            }
        }
        return '';
    };

    const findNextSection = (text, startIndex) => {
        const sectionMarkers = [
            'Potential Benefits:', '**Potential Benefits:**',
            'Potential Drawbacks:', '**Potential Drawbacks:**',
            'Overall Assessment:', '**Overall Assessment:**',
            'Constitutional', 'Safety Impact', 'State Context',
            'Second Amendment', 'Fourth Amendment', 'Fourteenth Amendment'
        ];
        
        let earliestIndex = -1;
        for (const marker of sectionMarkers) {
            const index = text.indexOf(marker, startIndex);
            if (index !== -1 && (earliestIndex === -1 || index < earliestIndex)) {
                earliestIndex = index;
            }
        }
        
        return earliestIndex;
    };

    const extractConstitutionalSection = (text) => {
        // Look for constitutional analysis patterns
        const constitutionalMarkers = [
            'Second Amendment', 'Fourth Amendment', 'Fourteenth Amendment',
            'Constitutional', 'Due Process', 'Equal Protection'
        ];
        
        let startIndex = -1;
        let endIndex = text.length;
        
        // Find the start of constitutional discussion
        for (const marker of constitutionalMarkers) {
            const index = text.indexOf(marker);
            if (index !== -1 && (startIndex === -1 || index < startIndex)) {
                startIndex = index;
            }
        }
        
        if (startIndex === -1) return '';
        
        // Find the end (next major section or end of text)
        const nextSections = ['Potential Benefits', 'Potential Drawbacks', 'Overall Assessment', 'Safety Impact'];
        for (const section of nextSections) {
            const index = text.indexOf(section, startIndex + 50);
            if (index !== -1 && index < endIndex) {
                endIndex = index;
            }
        }
        
        let content = text.substring(startIndex, endIndex).trim();
        content = content.replace(/\*\*/g, ''); // Remove bold markers
        content = content.replace(/\*/g, '•'); // Convert asterisks to bullets
        
        return content;
    };

    const extractSafetySection = (text) => {
        // Look for safety-related content
        const safetyMarkers = [
            'public safety', 'gun violence', 'safety implications',
            'crime prevention', 'law enforcement'
        ];
        
        let startIndex = -1;
        let endIndex = text.length;
        
        // Find safety-related content
        for (const marker of safetyMarkers) {
            const index = text.toLowerCase().indexOf(marker.toLowerCase());
            if (index !== -1 && (startIndex === -1 || index < startIndex)) {
                startIndex = index;
            }
        }
        
        if (startIndex === -1) return '';
        
        // Extract a reasonable chunk around the safety content
        const chunkStart = Math.max(0, startIndex - 100);
        const chunkEnd = Math.min(text.length, startIndex + 500);
        
        let content = text.substring(chunkStart, chunkEnd).trim();
        content = content.replace(/\*\*/g, ''); // Remove bold markers
        content = content.replace(/\*/g, '•'); // Convert asterisks to bullets
        
        return content;
    };

    const getUnusedText = (text, usedRanges) => {
        if (usedRanges.length === 0) return text;
        
        // Sort ranges by start position
        const sortedRanges = usedRanges.sort((a, b) => a.start - b.start);
        
        let unusedText = '';
        let lastEnd = 0;
        
        sortedRanges.forEach(range => {
            if (range.start > lastEnd) {
                unusedText += text.substring(lastEnd, range.start);
            }
            lastEnd = Math.max(lastEnd, range.end);
        });
        
        // Add remaining text after last range
        if (lastEnd < text.length) {
            unusedText += text.substring(lastEnd);
        }
        
        return unusedText.trim();
    };

    const organizeRemainingText = (text) => {
        const sections = {};
        
        // Look for constitutional content
        if (text.includes('Second Amendment') || text.includes('Constitutional') || text.includes('Due Process')) {
            sections['Constitutional Analysis'] = cleanText(text.substring(0, Math.min(800, text.length)));
        } else {
            // If no clear constitutional content, just show as analysis
            sections['Policy Analysis'] = cleanText(text.substring(0, Math.min(1000, text.length)));
        }
        
        return sections;
    };

    const organizeEntireText = (text) => {
        const sections = {};
        
        // Try to identify the main theme
        if (text.includes('Potential Benefits') || text.includes('Potential Drawbacks')) {
            // This looks like a safety analysis
            sections['Safety Analysis'] = cleanText(text);
        } else if (text.includes('Second Amendment') || text.includes('Constitutional')) {
            // This looks like constitutional analysis
            sections['Constitutional Analysis'] = cleanText(text);
        } else {
            // General policy analysis
            sections['Policy Analysis'] = cleanText(text);
        }
        
        return sections;
    };

    const cleanText = (text) => {
        return text
            .replace(/\*\*/g, '') // Remove bold markers
            .replace(/\*/g, '•') // Convert asterisks to bullets
            .trim();
    };

    const parsedAnalysis = parseAnalysis(analysis);
    
    // Use typewriter effect for the entire analysis text
    const { displayedText, isTyping, isComplete, skipToEnd } = useTypewriter(
        analysis, 
        30, // typing speed in milliseconds
        enableTypewriter
    );
    
    // Parse the displayed text (which might be partial during typing)
    const displayedParsedAnalysis = enableTypewriter ? parseAnalysis(displayedText) : parsedAnalysis;
    
    // Debug log to see what sections are being created
    if (enableTypewriter && isTyping) {
        console.log('Displayed text length:', displayedText.length);
        console.log('Parsed sections:', Object.keys(displayedParsedAnalysis));
        console.log('Section content lengths:', Object.entries(displayedParsedAnalysis).map(([title, content]) => [title, content.length]));
    }

    return (
        <div className="visual-analysis">
            
            {Object.entries(displayedParsedAnalysis)
                .filter(([title, content]) => title && content && content.trim().length > 0)
                .map(([title, content], index) => (
                <div key={index} className="analysis-section">
                    {!hideSectionTitles && (
                        <div className="section-header">
                            <div className="section-title-group">
                                <h3 className="section-title">{title}</h3>
                            </div>
                            {enableTypewriter && isTyping && index === 0 && (
                                <button 
                                    onClick={() => {
                                        console.log('Skip button clicked, isTyping:', isTyping);
                                        skipToEnd();
                                    }} 
                                    className="skip-typing-btn"
                                    title="Skip typing animation and show full response"
                                >
                                    Skip
                                </button>
                            )}
                        </div>
                    )}
                    <div className="section-content">
                        {content.split('\n').map((line, lineIndex) => (
                            line.trim() ? (
                                <div key={lineIndex} className="content-line">
                                    {line.startsWith('•') || line.startsWith('-') || line.startsWith('*') ? (
                                        <span className="bullet-point">{parseTextWithBold(line)}</span>
                                    ) : (
                                        <span className="content-text">{parseTextWithBold(line)}</span>
                                    )}
                                </div>
                            ) : null
                        ))}
                    </div>
                    
                    {enableTypewriter && isTyping && index === Object.keys(displayedParsedAnalysis).length - 1 && (
                        <div className="typing-cursor">
                            <span className="cursor-blink">|</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default VisualAnalysisResponse;
