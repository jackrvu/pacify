#!/usr/bin/env python3
"""
MediaCloud News API Script for Gun Violence and Gun Control Articles

This script searches for articles about gun violence and gun control in a specific state
using the MediaCloud API and saves the results to a CSV file.

Usage:
    python mediacloud_control_news.py --state "California" --api-key YOUR_API_KEY
    python mediacloud_control_news.py --state "Texas" --api-key YOUR_API_KEY --max-articles 15
"""

import argparse
import csv
import json
import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

try:
    from mediacloud.api import SearchApi
except ImportError:
    print("Error: mediacloud package not found. Please install it with: pip install mediacloud")
    sys.exit(1)


class MediaCloudNewsFetcher:
    """Class to handle MediaCloud API interactions for gun violence news."""
    
    def __init__(self, api_key: str):
        """Initialize the MediaCloud client with API key."""
        self.api_key = api_key
        self.mc = SearchApi(api_key)
    
    def search_gun_news(self, state: str, max_articles: int = 25, 
                       days_back: int = 30) -> List[Dict[str, Any]]:
        """
        Search for gun violence and gun control articles in a specific state.
        
        Args:
            state: The state to search for (e.g., "California", "Texas")
            max_articles: Maximum number of articles to retrieve
            days_back: Number of days back to search (default 30)
            
        Returns:
            List of article dictionaries
        """
        # Construct search query for violence with state name
        # Try different query formats that might work better with the API
        query = f'violence'
        
        # Calculate date range - use a broader range to avoid API restrictions
        end_date = datetime.now().date()
        start_date = (datetime.now() - timedelta(days=min(days_back, 90))).date()  # Cap at 90 days
        
        print(f"Searching for articles about violence in {state}...")
        print(f"Date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
        print(f"Query: {query}")
        
        try:
            # Search for stories
            results, pagination_token = self.mc.story_list(
                query=query,
                start_date=start_date,
                end_date=end_date,
                page_size=max_articles,
                sort_order='publish_date desc'
            )
            
            print(f"Found {len(results)} articles")
            
            # Filter results by state if specified
            if state:
                filtered_results = []
                for article in results:
                    title = article.get('title', '').lower()
                    # Check if state name appears in title or content
                    if state.lower() in title:
                        filtered_results.append(article)
                
                print(f"Filtered to {len(filtered_results)} articles mentioning {state}")
                return filtered_results[:max_articles]
            
            return results[:max_articles]
            
        except Exception as e:
            print(f"Error searching MediaCloud API: {e}")
            # Try with a simpler query if the first one fails
            try:
                print("Trying with simpler query...")
                simple_query = 'gun'
                results, pagination_token = self.mc.story_list(
                    query=simple_query,
                    start_date=start_date,
                    end_date=end_date,
                    page_size=max_articles * 3,  # Get more results to filter
                    sort_order='publish_date desc'
                )
                print(f"Found {len(results)} articles with simpler query")
                
                # Filter by state
                if state:
                    filtered_results = []
                    for article in results:
                        title = article.get('title', '').lower()
                        if state.lower() in title:
                            filtered_results.append(article)
                    
                    print(f"Filtered to {len(filtered_results)} articles mentioning {state}")
                    return filtered_results[:max_articles]
                
                return results[:max_articles]
            except Exception as e2:
                print(f"Error with simpler query: {e2}")
                return []
    
    def save_to_csv(self, articles: List[Dict[str, Any]], filename: str) -> None:
        """Save articles to CSV file."""
        if not articles:
            print("No articles to save.")
            return
        
        fieldnames = [
            'title', 'url', 'publish_date', 'media_name', 'media_id',
            'language', 'word_count', 'sentences_count', 'story_id'
        ]
        
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for article in articles:
                # Extract relevant fields, handling missing keys
                row = {}
                for field in fieldnames:
                    row[field] = article.get(field, '')
                writer.writerow(row)
        
        print(f"Articles saved to {filename}")
    
    def save_to_json(self, articles: List[Dict[str, Any]], filename: str) -> None:
        """Save articles to JSON file."""
        if not articles:
            print("No articles to save.")
            return
        
        # Prepare data for JSON serialization
        json_data = {
            'search_metadata': {
                'total_articles': len(articles),
                'search_date': datetime.now().isoformat(),
                'query_used': articles[0].get('query', 'Unknown') if articles else 'Unknown'
            },
            'articles': articles
        }
        
        with open(filename, 'w', encoding='utf-8') as jsonfile:
            json.dump(json_data, jsonfile, indent=2, ensure_ascii=False, default=str)
        
        print(f"Articles saved to {filename}")


def main():
    """Main function to run the MediaCloud news fetcher."""
    parser = argparse.ArgumentParser(
        description='Fetch gun violence and gun control news articles from MediaCloud API'
    )
    parser.add_argument(
        '--state', 
        required=True, 
        help='State to search for (e.g., "California", "Texas", "New York")'
    )
    parser.add_argument(
        '--api-key', 
        help='MediaCloud API key (or set MEDIACLOUD_API_KEY environment variable)'
    )
    parser.add_argument(
        '--max-articles', 
        type=int, 
        default=25, 
        help='Maximum number of articles to retrieve (default: 25)'
    )
    parser.add_argument(
        '--days-back', 
        type=int, 
        default=30, 
        help='Number of days back to search (default: 30)'
    )
    parser.add_argument(
        '--output-format', 
        choices=['csv', 'json', 'both'], 
        default='csv',
        help='Output format (default: csv)'
    )
    parser.add_argument(
        '--output-dir', 
        default='.',
        help='Output directory for saved files (default: current directory)'
    )
    
    args = parser.parse_args()
    
    # Get API key from argument or environment variable
    api_key = args.api_key or os.getenv('MEDIACLOUD_API_KEY')
    if not api_key:
        print("Error: MediaCloud API key required.")
        print("Provide it via --api-key argument or set MEDIACLOUD_API_KEY environment variable.")
        sys.exit(1)
    
    # Validate state name
    if not args.state.strip():
        print("Error: State name cannot be empty.")
        sys.exit(1)
    
    # Create output directory if it doesn't exist
    os.makedirs(args.output_dir, exist_ok=True)
    
    # Initialize fetcher
    fetcher = MediaCloudNewsFetcher(api_key)
    
    # Search for articles
    articles = fetcher.search_gun_news(
        state=args.state, 
        max_articles=args.max_articles,
        days_back=args.days_back
    )
    
    if not articles:
        print("No articles found. Try adjusting your search parameters.")
        return
    
    # Generate filename based on state and date
    state_clean = args.state.replace(' ', '_').lower()
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Save articles in requested format(s)
    if args.output_format in ['csv', 'both']:
        csv_filename = os.path.join(
            args.output_dir, 
            f'gun_news_{state_clean}_{timestamp}.csv'
        )
        fetcher.save_to_csv(articles, csv_filename)
    
    if args.output_format in ['json', 'both']:
        json_filename = os.path.join(
            args.output_dir, 
            f'gun_news_{state_clean}_{timestamp}.json'
        )
        fetcher.save_to_json(articles, json_filename)
    
    # Print summary
    print(f"\nSummary:")
    print(f"State: {args.state}")
    print(f"Articles found: {len(articles)}")
    print(f"Date range: {args.days_back} days back")
    
    # Show sample article titles
    if articles:
        print(f"\nSample article titles:")
        for i, article in enumerate(articles[:3], 1):
            title = article.get('title', 'No title')[:80]
            print(f"  {i}. {title}...")
        if len(articles) > 3:
            print(f"  ... and {len(articles) - 3} more articles")


if __name__ == '__main__':
    main()
