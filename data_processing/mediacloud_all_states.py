#!/usr/bin/env python3
"""
MediaCloud All States News Fetcher

This script fetches gun-related articles for all 50 US states and stores them in one massive JSON file.
It tries multiple search strategies to maximize article retrieval for each state.
"""

import json
import os
import sys
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

try:
    from mediacloud.api import SearchApi
except ImportError:
    print("Error: mediacloud package not found. Please install it with: pip install mediacloud")
    sys.exit(1)

# List of all 50 US states
US_STATES = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", 
    "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", 
    "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", 
    "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", 
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", 
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", 
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", 
    "Wisconsin", "Wyoming"
]

# Alternative state names and abbreviations for better matching
STATE_VARIANTS = {
    "California": ["CA", "Calif", "Cal"],
    "New York": ["NY", "New York State"],
    "Texas": ["TX", "Tex"],
    "Florida": ["FL", "Fla"],
    "Pennsylvania": ["PA", "Penn"],
    "Illinois": ["IL", "Ill"],
    "Ohio": ["OH"],
    "Georgia": ["GA"],
    "North Carolina": ["NC", "N.C."],
    "Michigan": ["MI", "Mich"],
    "New Jersey": ["NJ", "N.J."],
    "Virginia": ["VA"],
    "Washington": ["WA", "Wash"],
    "Arizona": ["AZ", "Ariz"],
    "Massachusetts": ["MA", "Mass"],
    "Tennessee": ["TN", "Tenn"],
    "Indiana": ["IN", "Ind"],
    "Missouri": ["MO", "Mo"],
    "Maryland": ["MD", "Md"],
    "Wisconsin": ["WI", "Wisc"],
    "Colorado": ["CO", "Colo"],
    "Minnesota": ["MN", "Minn"],
    "South Carolina": ["SC", "S.C."],
    "Alabama": ["AL", "Ala"],
    "Louisiana": ["LA", "La"],
    "Kentucky": ["KY", "Ky"],
    "Oregon": ["OR", "Ore"],
    "Oklahoma": ["OK", "Okla"],
    "Connecticut": ["CT", "Conn"],
    "Utah": ["UT"],
    "Iowa": ["IA"],
    "Nevada": ["NV", "Nev"],
    "Arkansas": ["AR", "Ark"],
    "Mississippi": ["MS", "Miss"],
    "Kansas": ["KS", "Kan"],
    "New Mexico": ["NM", "N.M."],
    "Nebraska": ["NE", "Neb"],
    "West Virginia": ["WV", "W.Va."],
    "Idaho": ["ID"],
    "Hawaii": ["HI"],
    "New Hampshire": ["NH", "N.H."],
    "Maine": ["ME"],
    "Montana": ["MT", "Mont"],
    "Rhode Island": ["RI", "R.I."],
    "Delaware": ["DE", "Del"],
    "South Dakota": ["SD", "S.D."],
    "North Dakota": ["ND", "N.D."],
    "Alaska": ["AK", "Alas"],
    "Vermont": ["VT", "Vt"],
    "Wyoming": ["WY", "Wyo"]
}

class AllStatesNewsFetcher:
    """Class to fetch gun-related news for all US states."""
    
    def __init__(self, api_key: str):
        """Initialize the MediaCloud client with API key."""
        self.api_key = api_key
        self.mc = SearchApi(api_key)
        self.all_articles = []
        self.state_stats = {}
        
    def get_search_queries(self, state: str) -> List[str]:
        """Generate multiple search queries for a state."""
        queries = []
        
        # Get state variants
        variants = STATE_VARIANTS.get(state, [])
        all_state_names = [state] + variants
        
        # Very broad gun-related terms - prioritize simple terms
        gun_terms = [
            "gun", "guns", "firearm", "firearms", "weapon", "weapons",
            "shooting", "shootings", "gun violence", "gun control", 
            "gun policy", "gun laws", "gun regulation", "mass shooting",
            "gun rights", "gun safety", "ammunition", "ammo", "rifle", "pistol"
        ]
        
        # Create very simple combinations first
        for state_name in all_state_names:
            # Most basic searches
            queries.append(f"gun {state_name}")
            queries.append(f"guns {state_name}")
            queries.append(f"firearm {state_name}")
            queries.append(f"firearms {state_name}")
            queries.append(f"weapon {state_name}")
            queries.append(f"weapons {state_name}")
            queries.append(f"shooting {state_name}")
            queries.append(f"shootings {state_name}")
        
        # Add some quoted versions for exact matching
        for state_name in all_state_names:
            queries.append(f'"gun" "{state_name}"')
            queries.append(f'"guns" "{state_name}"')
            queries.append(f'"firearm" "{state_name}"')
            queries.append(f'"weapon" "{state_name}"')
        
        # Add some AND combinations
        for state_name in all_state_names:
            queries.append(f"gun AND {state_name}")
            queries.append(f"guns AND {state_name}")
            queries.append(f"firearm AND {state_name}")
            queries.append(f"weapon AND {state_name}")
        
        return queries[:10]  # Increase to 10 queries per state for broader coverage
    
    def search_for_state(self, state: str, max_articles: int = 50) -> List[Dict[str, Any]]:
        """Search for articles for a specific state using multiple strategies."""
        print(f"\n🔍 Searching for articles about {state}...")
        
        queries = self.get_search_queries(state)
        all_articles = []
        seen_urls = set()
        fallback_attempted = False  # Track if we've already tried fallback
        start_time = time.time()
        max_time_per_state = 60  # Maximum 60 seconds per state
        
        # Use a broader date range
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30)
        
        for i, query in enumerate(queries):
            # Safety checks to prevent infinite loops
            if i >= 15:  # Maximum 15 queries per state
                print(f"  Reached maximum query limit for {state}")
                break
            
            # Timeout check
            if time.time() - start_time > max_time_per_state:
                print(f"  Timeout reached for {state} ({max_time_per_state}s)")
                break
                
            try:
                print(f"  Trying query {i+1}/{len(queries)}: {query[:50]}...")
                
                results, pagination_token = self.mc.story_list(
                    query=query,
                    start_date=start_date,
                    end_date=end_date,
                    page_size=min(20, max_articles - len(all_articles))
                )
                
                # Filter for articles that actually mention the state
                for article in results:
                    title = article.get('title', '').lower()
                    url = article.get('url', '')
                    
                    # Skip if we've already seen this URL
                    if url in seen_urls:
                        continue
                    
                    # Check if article mentions the state or its variants
                    state_mentioned = False
                    for state_name in [state.lower()] + [v.lower() for v in STATE_VARIANTS.get(state, [])]:
                        if state_name in title:
                            state_mentioned = True
                            break
                    
                    if state_mentioned:
                        article['search_query'] = query
                        article['state'] = state
                        all_articles.append(article)
                        seen_urls.add(url)
                        
                        if len(all_articles) >= max_articles:
                            break
                
                # If we have enough articles, break
                if len(all_articles) >= max_articles:
                    break
                    
                # Rate limiting - longer delay between requests
                time.sleep(2.0)
                
            except Exception as e:
                print(f"    Error with query '{query}': {e}")
                # If we get 403 errors, try a fallback approach (only once per state)
                if "403" in str(e) and len(all_articles) < max_articles and not fallback_attempted:
                    print(f"    Trying fallback approach for {state}...")
                    fallback_attempted = True
                    try:
                        # Search for general gun articles and filter by state
                        fallback_results, _ = self.mc.story_list(
                            query='gun OR guns OR firearm OR firearms OR weapon OR weapons OR shooting OR shootings',
                            start_date=start_date,
                            end_date=end_date,
                            page_size=100  # Get more results to filter
                        )
                        
                        # Filter for articles mentioning the state
                        for article in fallback_results:
                            title = article.get('title', '').lower()
                            # Check if state name or any variant appears in title
                            state_mentioned = False
                            for state_name in [state.lower()] + [v.lower() for v in STATE_VARIANTS.get(state, [])]:
                                if state_name in title:
                                    state_mentioned = True
                                    break
                            
                            if state_mentioned:
                                article['search_query'] = f'gun OR guns OR firearm OR firearms OR weapon OR weapons OR shooting OR shootings (filtered for {state})'
                                article['state'] = state
                                all_articles.append(article)
                                if len(all_articles) >= max_articles:
                                    break
                        
                        if all_articles:
                            print(f"    Fallback found {len(all_articles)} articles for {state}")
                            break
                    except Exception as e2:
                        print(f"    Fallback also failed: {e2}")
                continue
        
        print(f"  ✅ Found {len(all_articles)} articles for {state}")
        return all_articles
    
    def fetch_all_states(self, max_articles_per_state: int = 50) -> None:
        """Fetch articles for all 50 states."""
        print(f"🚀 Starting comprehensive search for all 50 US states...")
        print(f"📊 Target: {max_articles_per_state} articles per state")
        print(f"📅 Date range: Last 30 days")
        print("=" * 60)
        
        total_articles = 0
        
        for i, state in enumerate(US_STATES, 1):
            print(f"\n[{i}/50] Processing {state}...")
            
            try:
                articles = self.search_for_state(state, max_articles_per_state)
                self.all_articles.extend(articles)
                self.state_stats[state] = len(articles)
                total_articles += len(articles)
                
                print(f"  📈 Running total: {total_articles} articles")
                
                # Rate limiting between states - longer delay
                time.sleep(3)
                
            except Exception as e:
                print(f"  ❌ Error processing {state}: {e}")
                self.state_stats[state] = 0
                continue
        
        print(f"\n🎉 Search complete!")
        print(f"📊 Total articles found: {total_articles}")
        print(f"📈 Average per state: {total_articles / 50:.1f}")
    
    def save_to_json(self, filename: str) -> None:
        """Save all articles to a massive JSON file."""
        if not self.all_articles:
            print("No articles to save.")
            return
        
        # Prepare comprehensive data structure
        output_data = {
            'metadata': {
                'total_articles': len(self.all_articles),
                'search_date': datetime.now().isoformat(),
                'date_range_days': 30,
                'states_covered': len([s for s in self.state_stats.values() if s > 0]),
                'api_used': 'MediaCloud',
                'search_strategy': 'Multi-query per state with gun-related terms'
            },
            'state_statistics': self.state_stats,
            'articles_by_state': {},
            'all_articles': self.all_articles
        }
        
        # Group articles by state
        for article in self.all_articles:
            state = article.get('state', 'Unknown')
            if state not in output_data['articles_by_state']:
                output_data['articles_by_state'][state] = []
            output_data['articles_by_state'][state].append(article)
        
        # Save to file
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False, default=str)
        
        print(f"💾 Saved {len(self.all_articles)} articles to {filename}")
        
        # Print summary statistics
        print(f"\n📊 Summary by State:")
        for state, count in sorted(self.state_stats.items(), key=lambda x: x[1], reverse=True):
            if count > 0:
                print(f"  {state}: {count} articles")
        
        states_with_no_articles = [state for state, count in self.state_stats.items() if count == 0]
        if states_with_no_articles:
            print(f"\n⚠️  States with no articles found: {', '.join(states_with_no_articles)}")


def main():
    """Main function."""
    # Get API key from environment
    api_key = os.getenv('MEDIACLOUD_API_KEY')
    if not api_key:
        print("Error: MEDIACLOUD_API_KEY environment variable not set.")
        print("Please set it with: export MEDIACLOUD_API_KEY=your_api_key")
        sys.exit(1)
    
    # Get max articles per state from command line or use default
    max_articles = int(sys.argv[1]) if len(sys.argv) > 1 else 50
    
    print(f"🔫 MediaCloud All States Gun News Fetcher")
    print(f"📊 Target: {max_articles} articles per state")
    print(f"🌍 States: All 50 US states")
    print(f"⏰ Estimated time: {50 * 2} minutes")
    print("=" * 60)
    
    # Initialize fetcher
    fetcher = AllStatesNewsFetcher(api_key)
    
    # Fetch articles for all states
    fetcher.fetch_all_states(max_articles)
    
    # Generate filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"all_states_gun_news_{timestamp}.json"
    
    # Save to JSON
    fetcher.save_to_json(filename)
    
    print(f"\n✅ Complete! Check {filename} for all results.")


if __name__ == '__main__':
    main()
