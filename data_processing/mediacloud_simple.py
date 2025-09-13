#!/usr/bin/env python3
"""
Simple MediaCloud News API Script

This is a simplified version that works with the current API limitations.
"""

import csv
import json
import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any

try:
    from mediacloud.api import SearchApi
except ImportError:
    print("Error: mediacloud package not found. Please install it with: pip install mediacloud")
    sys.exit(1)


def search_gun_news(api_key: str, state: str = None, max_articles: int = 25) -> List[Dict[str, Any]]:
    """Search for gun-related news articles."""
    api = SearchApi(api_key)
    
    # Use a broader date range that works with the API
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=7)  # Last 7 days
    
    print(f"Searching for gun-related articles...")
    if state:
        print(f"Will filter for articles mentioning: {state}")
    print(f"Date range: {start_date} to {end_date}")
    
    try:
        # Search for gun-related articles
        results, pagination_token = api.story_list(
            query='gun',
            start_date=start_date,
            end_date=end_date,
            page_size=max_articles * 2  # Get more to filter
        )
        
        print(f"Found {len(results)} total articles")
        
        # Filter by state if specified
        if state:
            filtered_results = []
            for article in results:
                title = article.get('title', '').lower()
                if state.lower() in title:
                    filtered_results.append(article)
            
            print(f"Filtered to {len(filtered_results)} articles mentioning {state}")
            return filtered_results[:max_articles]
        
        return results[:max_articles]
        
    except Exception as e:
        print(f"Error searching MediaCloud API: {e}")
        return []


def save_articles(articles: List[Dict[str, Any]], state: str = None, output_dir: str = '.'):
    """Save articles to CSV and JSON files."""
    if not articles:
        print("No articles to save.")
        return
    
    # Generate filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    state_suffix = f"_{state.replace(' ', '_').lower()}" if state else ""
    base_filename = f"gun_news{state_suffix}_{timestamp}"
    
    # Save as CSV
    csv_filename = os.path.join(output_dir, f"{base_filename}.csv")
    fieldnames = ['title', 'url', 'publish_date', 'media_name', 'media_id', 'language', 'word_count', 'sentences_count', 'story_id']
    
    with open(csv_filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for article in articles:
            row = {}
            for field in fieldnames:
                row[field] = article.get(field, '')
            writer.writerow(row)
    
    print(f"Articles saved to {csv_filename}")
    
    # Save as JSON
    json_filename = os.path.join(output_dir, f"{base_filename}.json")
    json_data = {
        'search_metadata': {
            'total_articles': len(articles),
            'search_date': datetime.now().isoformat(),
            'state_filter': state,
            'query_used': 'gun'
        },
        'articles': articles
    }
    
    with open(json_filename, 'w', encoding='utf-8') as jsonfile:
        json.dump(json_data, jsonfile, indent=2, ensure_ascii=False, default=str)
    
    print(f"Articles saved to {json_filename}")


def main():
    """Main function."""
    # Get API key from environment
    api_key = os.getenv('MEDIACLOUD_API_KEY')
    if not api_key:
        print("Error: MEDIACLOUD_API_KEY environment variable not set.")
        sys.exit(1)
    
    # Get state from command line or use None
    state = sys.argv[1] if len(sys.argv) > 1 else None
    max_articles = int(sys.argv[2]) if len(sys.argv) > 2 else 25
    
    print(f"Searching for gun-related news...")
    if state:
        print(f"State filter: {state}")
    print(f"Max articles: {max_articles}")
    
    # Search for articles
    articles = search_gun_news(api_key, state, max_articles)
    
    if articles:
        # Save articles
        save_articles(articles, state)
        
        # Show sample
        print(f"\nSample articles:")
        for i, article in enumerate(articles[:3], 1):
            title = article.get('title', 'No title')[:80]
            print(f"  {i}. {title}...")
        if len(articles) > 3:
            print(f"  ... and {len(articles) - 3} more articles")
    else:
        print("No articles found.")


if __name__ == '__main__':
    main()
