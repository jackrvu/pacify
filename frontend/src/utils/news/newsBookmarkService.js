// News Bookmark Service - Handles news article bookmarking with local storage
// Provides CRUD operations for bookmarked news articles with annotations
// Independent from policy bookmarks but follows the same structure for consistency

const NEWS_BOOKMARK_STORAGE_KEY = 'pacify_bookmarked_news';
const NEWS_ANNOTATION_STORAGE_KEY = 'pacify_news_annotations';

// Bookmark a news article
export const bookmarkNewsArticle = (article) => {
    try {
        const bookmarks = getBookmarkedNewsArticles();
        
        // Check if already bookmarked
        const existingIndex = bookmarks.findIndex(b => b.id === article.id);
        
        if (existingIndex === -1) {
            const bookmark = {
                id: article.id,
                title: article.title,
                link: article.link,
                published: article.published,
                summary: article.summary,
                source: article.source,
                content: article.content,
                state: article.state,
                bookmarked_at: new Date().toISOString(),
                annotations: []
            };
            
            bookmarks.push(bookmark);
            localStorage.setItem(NEWS_BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
            
            return { success: true, bookmark };
        } else {
            return { success: false, message: 'Article already bookmarked' };
        }
    } catch (error) {
        console.error('Error bookmarking news article:', error);
        return { success: false, message: 'Failed to bookmark article' };
    }
};

// Remove bookmark
export const unbookmarkNewsArticle = (articleId) => {
    try {
        const bookmarks = getBookmarkedNewsArticles();
        const filteredBookmarks = bookmarks.filter(b => b.id !== articleId);
        localStorage.setItem(NEWS_BOOKMARK_STORAGE_KEY, JSON.stringify(filteredBookmarks));
        
        // Also remove annotations
        removeAnnotationsForNewsArticle(articleId);
        
        return { success: true };
    } catch (error) {
        console.error('Error removing news bookmark:', error);
        return { success: false, message: 'Failed to remove bookmark' };
    }
};

// Get all bookmarked news articles
export const getBookmarkedNewsArticles = () => {
    try {
        const bookmarks = localStorage.getItem(NEWS_BOOKMARK_STORAGE_KEY);
        return bookmarks ? JSON.parse(bookmarks) : [];
    } catch (error) {
        console.error('Error loading news bookmarks:', error);
        return [];
    }
};

// Check if news article is bookmarked
export const isNewsArticleBookmarked = (articleId) => {
    const bookmarks = getBookmarkedNewsArticles();
    return bookmarks.some(b => b.id === articleId);
};

// Add annotation to a bookmarked news article
export const addNewsAnnotation = (articleId, annotation) => {
    try {
        const bookmarks = getBookmarkedNewsArticles();
        const bookmarkIndex = bookmarks.findIndex(b => b.id === articleId);
        
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
            localStorage.setItem(NEWS_BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
            
            return { success: true, annotation: newAnnotation };
        } else {
            return { success: false, message: 'Article not found in bookmarks' };
        }
    } catch (error) {
        console.error('Error adding news annotation:', error);
        return { success: false, message: 'Failed to add annotation' };
    }
};

// Update annotation
export const updateNewsAnnotation = (articleId, annotationId, updatedContent) => {
    try {
        const bookmarks = getBookmarkedNewsArticles();
        const bookmarkIndex = bookmarks.findIndex(b => b.id === articleId);
        
        if (bookmarkIndex !== -1) {
            const annotationIndex = bookmarks[bookmarkIndex].annotations.findIndex(a => a.id === annotationId);
            
            if (annotationIndex !== -1) {
                bookmarks[bookmarkIndex].annotations[annotationIndex].content = updatedContent;
                bookmarks[bookmarkIndex].annotations[annotationIndex].updated_at = new Date().toISOString();
                localStorage.setItem(NEWS_BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
                
                return { success: true };
            }
        }
        
        return { success: false, message: 'Annotation not found' };
    } catch (error) {
        console.error('Error updating news annotation:', error);
        return { success: false, message: 'Failed to update annotation' };
    }
};

// Remove annotation
export const removeNewsAnnotation = (articleId, annotationId) => {
    try {
        const bookmarks = getBookmarkedNewsArticles();
        const bookmarkIndex = bookmarks.findIndex(b => b.id === articleId);
        
        if (bookmarkIndex !== -1) {
            bookmarks[bookmarkIndex].annotations = bookmarks[bookmarkIndex].annotations.filter(a => a.id !== annotationId);
            localStorage.setItem(NEWS_BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
            
            return { success: true };
        }
        
        return { success: false, message: 'Annotation not found' };
    } catch (error) {
        console.error('Error removing news annotation:', error);
        return { success: false, message: 'Failed to remove annotation' };
    }
};

// Remove all annotations for a news article (when unbookmarking)
const removeAnnotationsForNewsArticle = (articleId) => {
    try {
        const annotations = JSON.parse(localStorage.getItem(NEWS_ANNOTATION_STORAGE_KEY) || '{}');
        delete annotations[articleId];
        localStorage.setItem(NEWS_ANNOTATION_STORAGE_KEY, JSON.stringify(annotations));
    } catch (error) {
        console.error('Error removing annotations for news article:', error);
    }
};

// Export news bookmarks as JSON
export const exportNewsBookmarks = () => {
    try {
        const bookmarks = getBookmarkedNewsArticles();
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
        a.download = `pacify_news_bookmarks_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return { success: true };
    } catch (error) {
        console.error('Error exporting news bookmarks:', error);
        return { success: false, message: 'Failed to export bookmarks' };
    }
};

// Import news bookmarks from JSON
export const importNewsBookmarks = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                
                if (importData.bookmarks && Array.isArray(importData.bookmarks)) {
                    localStorage.setItem(NEWS_BOOKMARK_STORAGE_KEY, JSON.stringify(importData.bookmarks));
                    resolve({ success: true, count: importData.bookmarks.length });
                } else {
                    resolve({ success: false, message: 'Invalid news bookmark file format' });
                }
            } catch (error) {
                console.error('Error importing news bookmarks:', error);
                resolve({ success: false, message: 'Failed to parse news bookmark file' });
            }
        };
        reader.readAsText(file);
    });
};
