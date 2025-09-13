#!/usr/bin/env python3
"""
Simple News Scraper for Gun Violence and Gun Control Articles

This script scrapes news articles directly from news websites without requiring API keys.

Usage:
    python simple_news_scraper.py --state "California"
    python simple_news_scraper.py --state "Texas" --max-articles 15
"""

import argparse
import csv
import json
import os
import sys
import requests
from datetime import datetime
from typing import List, Dict, Any
import time
import re

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Error: beautifulsoup4 package not found. Please install it with: pip install beautifulsoup4")
    sys.exit(1)


class SimpleNewsScraper:
    """Class to handle news scraping from various news websites."""
    
    def __init__(self):
        """Initialize the news scraper."""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def search_google_news(self, query: str, max_articles: int = 25) -> List[Dict[str, Any]]:
        """Search Google News using web scraping."""
        try:
            # Google News search URL
            search_url = f"https://news.google.com/search?q={query.replace(' ', '+')}&hl=en-US&gl=US&ceid=US:en"
            
            print(f"Searching Google News: {search_url}")
            response = self.session.get(search_url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            articles = []
            
            # Find article links in Google News
            article_links = soup.find_all('a', href=True)
            
            for link in article_links[:max_articles]:
                href = link.get('href', '')
                title = link.get_text(strip=True)
                
                # Skip if no title or if it's not a news article
                if not title or len(title) < 10:
                    continue
                
                # Skip navigation and other non-article links
                if any(skip in title.lower() for skip in ['search', 'more', 'show', 'hide', 'menu', 'login']):
                    continue
                
                # Clean up the URL (Google News URLs are often relative)
                if href.startswith('./'):
                    href = f"https://news.google.com{href[1:]}"
                elif href.startswith('/'):
                    href = f"https://news.google.com{href}"
                
                article = {
                    'title': title,
                    'link': href,
                    'published': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'summary': '',
                    'content': '',
                    'source': 'Google News Scraping'
                }
                
                articles.append(article)
            
            print(f"Found {len(articles)} articles from Google News")
            return articles
            
        except Exception as e:
            print(f"Error searching Google News: {e}")
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
                '.content',
                '.article-text',
                '.post-text'
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
    
    def search_gun_news(self, state: str, max_articles: int = 25) -> List[Dict[str, Any]]:
        """
        Search for gun violence and gun control articles using web scraping.
        
        Args:
            state: The state to search for (e.g., "California", "Texas")
            max_articles: Maximum number of articles to retrieve
            
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
            
            # Search Google News
            articles = self.search_google_news(term, max_articles // len(search_terms))
            
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
            time.sleep(2)  # Be respectful to servers
        
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
    """Main function to run the news scraper."""
    parser = argparse.ArgumentParser(
        description='Simple News Scraper for Gun Violence and Gun Control Articles'
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
    
    # Initialize scraper
    scraper = SimpleNewsScraper()
    
    # Search for articles
    print(f"Searching for gun violence/control articles in {args.state}...")
    articles = scraper.search_gun_news(
        state=args.state, 
        max_articles=args.max_articles
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
        scraper.save_to_csv(articles, csv_filename)
    
    if args.output_format in ['json', 'both']:
        json_filename = os.path.join(
            args.output_dir, 
            f'gun_news_{state_clean}_{timestamp}.json'
        )
        scraper.save_to_json(articles, json_filename)
    
    # Print summary
    print(f"\nSummary:")
    print(f"State: {args.state}")
    print(f"Articles found: {len(articles)}")
    print(f"Search method: Web scraping")
    
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
