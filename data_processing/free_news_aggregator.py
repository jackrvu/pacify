#!/usr/bin/env python3
"""
Free News Aggregator Script for Gun Violence and Gun Control Articles

This script searches for articles about gun violence and gun control using free RSS feeds
and web scraping, without requiring any API keys.

Usage:
    python free_news_aggregator.py --state "California"
    python free_news_aggregator.py --state "Texas" --max-articles 15
"""

import argparse
import csv
import json
import os
import sys
import requests
import feedparser
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from urllib.parse import urljoin, urlparse
import time
import re

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Error: beautifulsoup4 package not found. Please install it with: pip install beautifulsoup4")
    sys.exit(1)


class FreeNewsAggregator:
    """Class to handle free news aggregation using RSS feeds and web scraping."""
    
    def __init__(self):
        """Initialize the news aggregator."""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def get_news_rss_urls(self, state: str, query: str = "gun violence") -> List[str]:
        """Generate multiple RSS URLs for news sources."""
        encoded_query = f"{query}".replace(' ', '+')
        
        urls = [
            # Google News
            f"https://news.google.com/rss/search?q={encoded_query}&hl=en-US&gl=US&ceid=US:en",
            # AllSides RSS (balanced news)
            f"https://www.allsides.com/rss.xml",
            # Reuters RSS
            "https://feeds.reuters.com/reuters/topNews",
            # AP News RSS
            "https://feeds.apnews.com/rss/apf-topnews",
        ]
        return urls
    
    def get_rss_articles(self, rss_url: str, max_articles: int = 25) -> List[Dict[str, Any]]:
        """Fetch articles from RSS feed."""
        try:
            print(f"Fetching RSS feed: {rss_url}")
            feed = feedparser.parse(rss_url)
            
            articles = []
            for entry in feed.entries[:max_articles]:
                article = {
                    'title': entry.get('title', ''),
                    'link': entry.get('link', ''),
                    'published': entry.get('published', ''),
                    'summary': entry.get('summary', ''),
                    'source': 'RSS Feed'
                }
                articles.append(article)
            
            print(f"Found {len(articles)} articles from RSS feed")
            return articles
            
        except Exception as e:
            print(f"Error fetching RSS feed: {e}")
            return []
    
    def scrape_article_content(self, url: str) -> str:
        """Scrape full article content from URL."""
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Try to find article content in common selectors
            content_selectors = [
                'article',
                '.article-content',
                '.post-content',
                '.entry-content',
                '.story-body',
                '.article-body',
                'main',
                '.content'
            ]
            
            content = ""
            for selector in content_selectors:
                elements = soup.select(selector)
                if elements:
                    content = ' '.join([elem.get_text(strip=True) for elem in elements])
                    break
            
            # If no specific content found, get all paragraph text
            if not content:
                paragraphs = soup.find_all('p')
                content = ' '.join([p.get_text(strip=True) for p in paragraphs])
            
            return content[:2000]  # Limit content length
            
        except Exception as e:
            print(f"Error scraping article content: {e}")
            return ""
    
    def search_gun_news(self, state: str, max_articles: int = 25, 
                       days_back: int = 30) -> List[Dict[str, Any]]:
        """
        Search for gun violence and gun control articles using free sources.
        
        Args:
            state: The state to search for (e.g., "California", "Texas")
            max_articles: Maximum number of articles to retrieve
            days_back: Number of days back to search (not used for RSS, but kept for compatibility)
            
        Returns:
            List of article dictionaries
        """
        all_articles = []
        
        # Search terms to try
        search_terms = [
            f"gun violence {state}",
            f"gun control {state}",
            f"shooting {state}",
            f"firearms {state}"
        ]
        
        for term in search_terms:
            print(f"Searching for: {term}")
            
            # Get multiple RSS URLs
            rss_urls = self.get_news_rss_urls(state, term)
            articles = []
            
            for rss_url in rss_urls:
                feed_articles = self.get_rss_articles(rss_url, max_articles // (len(search_terms) * len(rss_urls)))
                articles.extend(feed_articles)
            
            # Add state filtering
            filtered_articles = []
            for article in articles:
                title = article.get('title', '').lower()
                summary = article.get('summary', '').lower()
                
                # Check if state name appears in title or summary
                if state.lower() in title or state.lower() in summary:
                    # Try to scrape full content
                    if article.get('link'):
                        content = self.scrape_article_content(article['link'])
                        article['content'] = content
                    
                    filtered_articles.append(article)
            
            all_articles.extend(filtered_articles)
            time.sleep(1)  # Be respectful to servers
        
        # Remove duplicates based on title
        seen_titles = set()
        unique_articles = []
        for article in all_articles:
            title = article.get('title', '')
            if title and title not in seen_titles:
                seen_titles.add(title)
                unique_articles.append(article)
        
        return unique_articles[:max_articles]
    
    def save_to_csv(self, articles: List[Dict[str, Any]], filename: str):
        """Save articles to CSV file."""
        if not articles:
            print("No articles to save.")
            return
        
        fieldnames = ['title', 'link', 'published', 'summary', 'content', 'source']
        
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for article in articles:
                # Clean up the data for CSV
                clean_article = {}
                for field in fieldnames:
                    value = article.get(field, '')
                    # Remove newlines and extra whitespace
                    if isinstance(value, str):
                        value = re.sub(r'\s+', ' ', value).strip()
                    clean_article[field] = value
                
                writer.writerow(clean_article)
        
        print(f"Saved {len(articles)} articles to {filename}")
    
    def save_to_json(self, articles: List[Dict[str, Any]], filename: str):
        """Save articles to JSON file."""
        if not articles:
            print("No articles to save.")
            return
        
        with open(filename, 'w', encoding='utf-8') as jsonfile:
            json.dump(articles, jsonfile, indent=2, ensure_ascii=False)
        
        print(f"Saved {len(articles)} articles to {filename}")


def main():
    """Main function to run the news aggregator."""
    parser = argparse.ArgumentParser(
        description='Free News Aggregator for Gun Violence and Gun Control Articles'
    )
    parser.add_argument(
        '--state', 
        required=True, 
        help='State to search for (e.g., "California", "Texas", "New York")'
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
        help='Number of days back to search (default: 30, not used for RSS)'
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
    
    # Validate state name
    if not args.state.strip():
        print("Error: State name cannot be empty.")
        sys.exit(1)
    
    # Create output directory if it doesn't exist
    os.makedirs(args.output_dir, exist_ok=True)
    
    # Initialize aggregator
    aggregator = FreeNewsAggregator()
    
    # Search for articles
    print(f"Searching for gun violence/control articles in {args.state}...")
    articles = aggregator.search_gun_news(
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
        aggregator.save_to_csv(articles, csv_filename)
    
    if args.output_format in ['json', 'both']:
        json_filename = os.path.join(
            args.output_dir, 
            f'gun_news_{state_clean}_{timestamp}.json'
        )
        aggregator.save_to_json(articles, json_filename)
    
    # Print summary
    print(f"\nSummary:")
    print(f"State: {args.state}")
    print(f"Articles found: {len(articles)}")
    print(f"Search method: Free RSS feeds and web scraping")
    
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
