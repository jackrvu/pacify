// Bookmark Service - Handles policy bookmarking with local storage
// Provides CRUD operations for bookmarked policies with annotations

const BOOKMARK_STORAGE_KEY = 'pacify_bookmarked_policies';
const ANNOTATION_STORAGE_KEY = 'pacify_policy_annotations';

// Bookmark a policy
export const bookmarkPolicy = (policy) => {
    try {
        const bookmarks = getBookmarkedPolicies();
        
        // Check if already bookmarked
        const existingIndex = bookmarks.findIndex(b => b.law_id === policy.law_id);
        
        if (existingIndex === -1) {
            const bookmark = {
                id: `bookmark_${Date.now()}`,
                law_id: policy.law_id,
                state: policy.state,
                law_class: policy.law_class,
                effect: policy.effect,
                effective_date: policy.effective_date,
                original_content: policy.original_content,
                human_explanation: policy.human_explanation,
                mass_shooting_analysis: policy.mass_shooting_analysis,
                state_mass_shooting_stats: policy.state_mass_shooting_stats,
                bookmarked_at: new Date().toISOString(),
                annotations: []
            };
            
            bookmarks.push(bookmark);
            localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
            
            return { success: true, bookmark };
        } else {
            return { success: false, message: 'Policy already bookmarked' };
        }
    } catch (error) {
        console.error('Error bookmarking policy:', error);
        return { success: false, message: 'Failed to bookmark policy' };
    }
};

// Remove bookmark
export const unbookmarkPolicy = (lawId) => {
    try {
        const bookmarks = getBookmarkedPolicies();
        const filteredBookmarks = bookmarks.filter(b => b.law_id !== lawId);
        localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(filteredBookmarks));
        
        // Also remove annotations
        removeAnnotationsForPolicy(lawId);
        
        return { success: true };
    } catch (error) {
        console.error('Error removing bookmark:', error);
        return { success: false, message: 'Failed to remove bookmark' };
    }
};

// Get all bookmarked policies
export const getBookmarkedPolicies = () => {
    try {
        const bookmarks = localStorage.getItem(BOOKMARK_STORAGE_KEY);
        return bookmarks ? JSON.parse(bookmarks) : [];
    } catch (error) {
        console.error('Error loading bookmarks:', error);
        return [];
    }
};

// Check if policy is bookmarked
export const isPolicyBookmarked = (lawId) => {
    const bookmarks = getBookmarkedPolicies();
    return bookmarks.some(b => b.law_id === lawId);
};

// Add annotation to a bookmarked policy
export const addAnnotation = (lawId, annotation) => {
    try {
        const bookmarks = getBookmarkedPolicies();
        const bookmarkIndex = bookmarks.findIndex(b => b.law_id === lawId);
        
        if (bookmarkIndex !== -1) {
            const newAnnotation = {
                id: `annotation_${Date.now()}`,
                content: annotation.content,
                type: annotation.type || 'note', // 'note', 'question', 'insight'
                created_at: new Date().toISOString(),
                gemini_response: annotation.gemini_response || null
            };
            
            if (!bookmarks[bookmarkIndex].annotations) {
                bookmarks[bookmarkIndex].annotations = [];
            }
            
            bookmarks[bookmarkIndex].annotations.push(newAnnotation);
            localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
            
            return { success: true, annotation: newAnnotation };
        } else {
            return { success: false, message: 'Policy not found in bookmarks' };
        }
    } catch (error) {
        console.error('Error adding annotation:', error);
        return { success: false, message: 'Failed to add annotation' };
    }
};

// Update annotation
export const updateAnnotation = (lawId, annotationId, updatedContent) => {
    try {
        const bookmarks = getBookmarkedPolicies();
        const bookmarkIndex = bookmarks.findIndex(b => b.law_id === lawId);
        
        if (bookmarkIndex !== -1) {
            const annotationIndex = bookmarks[bookmarkIndex].annotations.findIndex(a => a.id === annotationId);
            
            if (annotationIndex !== -1) {
                bookmarks[bookmarkIndex].annotations[annotationIndex].content = updatedContent;
                bookmarks[bookmarkIndex].annotations[annotationIndex].updated_at = new Date().toISOString();
                localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
                
                return { success: true };
            }
        }
        
        return { success: false, message: 'Annotation not found' };
    } catch (error) {
        console.error('Error updating annotation:', error);
        return { success: false, message: 'Failed to update annotation' };
    }
};

// Remove annotation
export const removeAnnotation = (lawId, annotationId) => {
    try {
        const bookmarks = getBookmarkedPolicies();
        const bookmarkIndex = bookmarks.findIndex(b => b.law_id === lawId);
        
        if (bookmarkIndex !== -1) {
            bookmarks[bookmarkIndex].annotations = bookmarks[bookmarkIndex].annotations.filter(a => a.id !== annotationId);
            localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
            
            return { success: true };
        }
        
        return { success: false, message: 'Annotation not found' };
    } catch (error) {
        console.error('Error removing annotation:', error);
        return { success: false, message: 'Failed to remove annotation' };
    }
};

// Remove all annotations for a policy (when unbookmarking)
const removeAnnotationsForPolicy = (lawId) => {
    try {
        const annotations = JSON.parse(localStorage.getItem(ANNOTATION_STORAGE_KEY) || '{}');
        delete annotations[lawId];
        localStorage.setItem(ANNOTATION_STORAGE_KEY, JSON.stringify(annotations));
    } catch (error) {
        console.error('Error removing annotations for policy:', error);
    }
};

// Export bookmarks as JSON
export const exportBookmarks = () => {
    try {
        const bookmarks = getBookmarkedPolicies();
        const exportData = {
            bookmarks,
            exported_at: new Date().toISOString(),
            version: '1.0.0'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pacify_bookmarks_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return { success: true };
    } catch (error) {
        console.error('Error exporting bookmarks:', error);
        return { success: false, message: 'Failed to export bookmarks' };
    }
};

// Import bookmarks from JSON
export const importBookmarks = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                
                if (importData.bookmarks && Array.isArray(importData.bookmarks)) {
                    localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(importData.bookmarks));
                    resolve({ success: true, count: importData.bookmarks.length });
                } else {
                    resolve({ success: false, message: 'Invalid bookmark file format' });
                }
            } catch (error) {
                console.error('Error importing bookmarks:', error);
                resolve({ success: false, message: 'Failed to parse bookmark file' });
            }
        };
        reader.readAsText(file);
    });
};
