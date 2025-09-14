#!/usr/bin/env python3
"""
Comprehensive Gun Violence News Generator
Generates CSV files with gun violence news data for multiple states using the working API
"""

import subprocess
import os
import pandas as pd
from datetime import datetime
import glob

def run_news_scraper(state, max_articles=200):
    """Run the news scraper for a specific state."""
    print(f"🔫 Fetching gun violence news for {state}...")
    
    cmd = [
        'python3', 'data_processing/free_news_aggregator.py',
        '--state', state,
        '--max-articles', str(max_articles)
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, cwd='/Users/kacemettahali/Desktop/pacify')
        if result.returncode == 0:
            print(f"✅ Successfully fetched news for {state}")
            return True
        else:
            print(f"❌ Error fetching news for {state}: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Exception fetching news for {state}: {e}")
        return False

def combine_csv_files():
    """Combine all generated CSV files into one comprehensive dataset."""
    print("📊 Combining CSV files...")
    
    # Find all gun news CSV files
    csv_files = glob.glob('gun_news_*.csv')
    
    if not csv_files:
        print("❌ No CSV files found to combine")
        return None
    
    print(f"Found {len(csv_files)} CSV files to combine")
    
    all_data = []
    
    for csv_file in csv_files:
        try:
            df = pd.read_csv(csv_file)
            print(f"  📄 {csv_file}: {len(df)} articles")
            all_data.append(df)
        except Exception as e:
            print(f"  ❌ Error reading {csv_file}: {e}")
    
    if not all_data:
        print("❌ No data to combine")
        return None
    
    # Combine all dataframes
    combined_df = pd.concat(all_data, ignore_index=True)
    
    # Remove duplicates based on URL (handle both 'url' and 'link' columns)
    initial_count = len(combined_df)
    
    # Normalize URL column - use 'url' if available, otherwise 'link'
    if 'url' in combined_df.columns and 'link' in combined_df.columns:
        # Fill missing URLs with link values
        combined_df['url'] = combined_df['url'].fillna(combined_df['link'])
    elif 'link' in combined_df.columns and 'url' not in combined_df.columns:
        # Rename link to url for consistency
        combined_df['url'] = combined_df['link']
    
    # Remove duplicates based on URL
    combined_df = combined_df.drop_duplicates(subset=['url'], keep='first')
    final_count = len(combined_df)
    
    print(f"📈 Combined dataset: {initial_count} → {final_count} articles (removed {initial_count - final_count} duplicates)")
    
    # Generate timestamp for filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f'comprehensive_gun_news_{timestamp}.csv'
    
    # Save combined dataset
    combined_df.to_csv(output_file, index=False)
    print(f"💾 Saved comprehensive dataset to: {output_file}")
    
    return output_file, combined_df

def generate_summary_report(df, output_file):
    """Generate a summary report of the dataset."""
    print("\n" + "="*60)
    print("📊 COMPREHENSIVE GUN VIOLENCE NEWS DATASET SUMMARY")
    print("="*60)
    
    print(f"📄 Total Articles: {len(df)}")
    print(f"📁 Output File: {output_file}")
    print(f"📅 Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # State breakdown
    if 'state' in df.columns:
        state_counts = df['state'].value_counts()
        print(f"\n🏛️  Articles by State:")
        for state, count in state_counts.head(10).items():
            print(f"   {state}: {count} articles")
    
    # Media source breakdown
    if 'media_name' in df.columns:
        media_counts = df['media_name'].value_counts()
        print(f"\n📰 Top Media Sources:")
        for media, count in media_counts.head(10).items():
            print(f"   {media}: {count} articles")
    
    # Date range
    if 'publish_date' in df.columns:
        df['publish_date'] = pd.to_datetime(df['publish_date'], errors='coerce')
        date_range = df['publish_date'].dropna()
        if len(date_range) > 0:
            print(f"\n📅 Date Range:")
            print(f"   Earliest: {date_range.min().strftime('%Y-%m-%d')}")
            print(f"   Latest: {date_range.max().strftime('%Y-%m-%d')}")
    
    # Sample articles
    print(f"\n📰 Sample Articles:")
    for i, (_, row) in enumerate(df.head(5).iterrows()):
        title = row.get('title', 'No title')[:80]
        date = row.get('publish_date', 'No date')
        media = row.get('media_name', 'Unknown')
        print(f"   {i+1}. {title}...")
        print(f"      📅 {date} | 🌐 {media}")
    
    print("\n✅ Dataset generation complete!")

def main():
    """Main function to generate comprehensive gun violence news dataset."""
    print("🔫 COMPREHENSIVE GUN VIOLENCE NEWS GENERATOR")
    print("="*60)
    print("📅 Generating dataset for the past 6 months")
    print("")
    
    # List of states to fetch news for
    states = [
        "California", "Texas", "Florida", "New York", "Illinois",
        "Pennsylvania", "Ohio", "Georgia", "North Carolina", "Michigan",
        "New Jersey", "Virginia", "Washington", "Arizona", "Massachusetts",
        "Tennessee", "Indiana", "Missouri", "Maryland", "Wisconsin",
        "Colorado", "Minnesota", "South Carolina", "Alabama", "Louisiana",
        "Kentucky", "Oregon", "Oklahoma", "Connecticut", "Utah"
    ]
    
    print(f"🎯 Target: {len(states)} states")
    print(f"📊 Expected articles: ~{len(states) * 50} articles")
    print("")
    
    # Fetch news for each state
    successful_states = []
    failed_states = []
    
    for i, state in enumerate(states, 1):
        print(f"[{i}/{len(states)}] Processing {state}...")
        
        if run_news_scraper(state, max_articles=100):
            successful_states.append(state)
        else:
            failed_states.append(state)
        
        print("")
    
    # Summary of fetching
    print("="*60)
    print("📊 FETCHING SUMMARY")
    print("="*60)
    print(f"✅ Successful: {len(successful_states)} states")
    print(f"❌ Failed: {len(failed_states)} states")
    
    if failed_states:
        print(f"Failed states: {', '.join(failed_states)}")
    
    if successful_states:
        print(f"Successful states: {', '.join(successful_states)}")
    
    print("")
    
    # Combine CSV files
    if successful_states:
        result = combine_csv_files()
        if result:
            output_file, combined_df = result
            generate_summary_report(combined_df, output_file)
        else:
            print("❌ Failed to combine CSV files")
    else:
        print("❌ No successful state fetches to combine")

if __name__ == "__main__":
    main()
