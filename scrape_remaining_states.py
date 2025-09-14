#!/usr/bin/env python3
"""
Script to scrape gun violence news for the remaining 20 states
and add them to the existing comprehensive CSV
"""

import subprocess
import os
import pandas as pd
from datetime import datetime
import glob

def run_news_scraper(state, max_articles=100):
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

def get_existing_states():
    """Get list of states that already have CSV files."""
    csv_files = glob.glob('gun_news_*_20250914_*.csv')
    existing_states = set()
    
    for csv_file in csv_files:
        # Extract state name from filename
        state_name = csv_file.replace('gun_news_', '').split('_20250914_')[0]
        existing_states.add(state_name)
    
    return existing_states

def get_all_us_states():
    """Get list of all 50 US states."""
    return [
        "Alabama", "Alaska", "Arizona", "Arkansas", "California",
        "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
        "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
        "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
        "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
        "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
        "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
        "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
        "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
        "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
    ]

def combine_with_existing_csv():
    """Combine new CSV files with the existing comprehensive CSV."""
    print("📊 Combining new CSV files with existing comprehensive dataset...")
    
    # Read the existing comprehensive CSV
    existing_csv = 'comprehensive_gun_news_20250914_012757.csv'
    if os.path.exists(existing_csv):
        print(f"📄 Reading existing comprehensive CSV: {existing_csv}")
        existing_df = pd.read_csv(existing_csv)
        print(f"   Existing articles: {len(existing_df)}")
    else:
        print("❌ Existing comprehensive CSV not found")
        return None
    
    # Find all new gun news CSV files (today's date)
    today = datetime.now().strftime("%Y%m%d")
    csv_files = glob.glob(f'gun_news_*_{today}_*.csv')
    
    if not csv_files:
        print("❌ No new CSV files found to combine")
        return None
    
    print(f"Found {len(csv_files)} new CSV files to combine")
    
    new_data = []
    
    for csv_file in csv_files:
        try:
            df = pd.read_csv(csv_file)
            print(f"  📄 {csv_file}: {len(df)} articles")
            new_data.append(df)
        except Exception as e:
            print(f"  ❌ Error reading {csv_file}: {e}")
    
    if not new_data:
        print("❌ No new data to combine")
        return None
    
    # Combine new dataframes
    new_combined_df = pd.concat(new_data, ignore_index=True)
    print(f"📈 New articles: {len(new_combined_df)}")
    
    # Combine with existing data
    all_data = [existing_df, new_combined_df]
    final_df = pd.concat(all_data, ignore_index=True)
    
    # Remove duplicates based on URL
    initial_count = len(final_df)
    
    # Normalize URL column
    if 'url' in final_df.columns and 'link' in final_df.columns:
        final_df['url'] = final_df['url'].fillna(final_df['link'])
    elif 'link' in final_df.columns and 'url' not in final_df.columns:
        final_df['url'] = final_df['link']
    
    # Remove duplicates
    final_df = final_df.drop_duplicates(subset=['url'], keep='first')
    final_count = len(final_df)
    
    print(f"📈 Final dataset: {initial_count} → {final_count} articles (removed {initial_count - final_count} duplicates)")
    
    # Generate timestamp for filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f'comprehensive_gun_news_{timestamp}.csv'
    
    # Save combined dataset
    final_df.to_csv(output_file, index=False)
    print(f"💾 Saved comprehensive dataset to: {output_file}")
    
    return output_file, final_df

def main():
    """Main function to scrape remaining states and update comprehensive dataset."""
    print("🔫 SCRAPING REMAINING STATES FOR GUN VIOLENCE NEWS")
    print("="*60)
    
    # Get existing states
    existing_states = get_existing_states()
    print(f"📊 States already covered: {len(existing_states)}")
    print(f"   {', '.join(sorted(existing_states))}")
    
    # Get all US states
    all_states = get_all_us_states()
    
    # Find missing states
    missing_states = []
    for state in all_states:
        state_lower = state.lower().replace(' ', '_')
        if state_lower not in existing_states:
            missing_states.append(state)
    
    print(f"\n🎯 Missing states: {len(missing_states)}")
    print(f"   {', '.join(missing_states)}")
    
    if not missing_states:
        print("✅ All states already covered!")
        return
    
    print(f"\n📊 Expected new articles: ~{len(missing_states) * 50} articles")
    print("")
    
    # Fetch news for missing states
    successful_states = []
    failed_states = []
    
    for i, state in enumerate(missing_states, 1):
        print(f"[{i}/{len(missing_states)}] Processing {state}...")
        
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
    
    # Combine with existing CSV
    if successful_states:
        result = combine_with_existing_csv()
        if result:
            output_file, combined_df = result
            print(f"\n✅ Updated comprehensive dataset saved to: {output_file}")
            print(f"📊 Total articles: {len(combined_df)}")
        else:
            print("❌ Failed to combine CSV files")
    else:
        print("❌ No successful state fetches to combine")

if __name__ == "__main__":
    main()
