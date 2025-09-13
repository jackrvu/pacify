#!/usr/bin/env python3
"""
Policy Analysis Script using Google Gemini API

This script analyzes gun policies from policy_sorted.csv and uses Google Gemini 
to translate them into human-readable terms and analyze their potential effects 
on mass shootings based on available incident data.

Setup:
1. Get a Google Gemini API key from: https://makersuite.google.com/app/apikey
2. Create a .env file in the same directory with: GEMINI_API_KEY=your-api-key-here
3. Run this script: python policy_analysis_gemini.py

Output: policy_analysis_results.json with all policy analyses

Author: Generated for Pacify Project
Date: 2024
"""

import csv
import os
import json
import sys
import subprocess
from typing import Dict, List, Tuple, Optional
from datetime import datetime
import time
import logging
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_and_install_dependencies():
    """Check for required packages and install if missing."""
    required_packages = {
        'pandas': 'pandas>=1.5.0',
        'google.generativeai': 'google-generativeai>=0.3.0',
        'python-dotenv': 'python-dotenv>=0.19.0'
    }
    
    missing_packages = []
    
    for package, pip_name in required_packages.items():
        try:
            if package == 'python-dotenv':
                __import__('dotenv')
            else:
                __import__(package)
        except ImportError:
            missing_packages.append(pip_name)
    
    if missing_packages:
        logger.info("Installing required packages...")
        logger.info(f"Missing: {', '.join(missing_packages)}")
        
        try:
            subprocess.check_call([
                sys.executable, "-m", "pip", "install"
            ] + missing_packages)
            logger.info("Packages installed successfully!")
        except subprocess.CalledProcessError as e:
            logger.error(f"Error installing packages: {e}")
            logger.error("Please install manually:")
            for package in missing_packages:
                logger.error(f"  pip install {package}")
            return False
    
    return True

def load_env_file():
    """Load environment variables from .env file."""
    try:
        from dotenv import load_dotenv
        
        # Look for .env file in script directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        env_path = os.path.join(script_dir, '.env')
        
        if os.path.exists(env_path):
            load_dotenv(env_path)
            logger.info("Loaded .env file")
            return True
        else:
            # Try parent directories
            for parent in [script_dir, os.path.dirname(script_dir), os.path.dirname(os.path.dirname(script_dir))]:
                env_path = os.path.join(parent, '.env')
                if os.path.exists(env_path):
                    load_dotenv(env_path)
                    logger.info(f"Loaded .env file from {env_path}")
                    return True
            
            logger.warning("No .env file found")
            return False
            
    except ImportError:
        logger.error("python-dotenv not available")
        return False

def get_api_key():
    """Get API key from environment."""
    load_env_file()
    
    api_key = os.getenv('GEMINI_API_KEY')
    
    if not api_key:
        logger.error("GEMINI_API_KEY not found in environment variables")
        logger.error("Please create a .env file with: GEMINI_API_KEY=your-api-key-here")
        logger.error("Or set environment variable: export GEMINI_API_KEY='your-api-key-here'")
        sys.exit(1)
    
    logger.info("API key found")
    return api_key

# Install dependencies and import packages
if not check_and_install_dependencies():
    sys.exit(1)

import pandas as pd
import google.generativeai as genai

def convert_numpy_types(obj):
    """Convert NumPy types to native Python types for JSON serialization."""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    else:
        return obj

class PolicyAnalyzer:
    def __init__(self, api_key: str):
        """Initialize the PolicyAnalyzer with Google Gemini API key."""
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Data paths
        self.base_path = "/Users/jackvu/Desktop/latex_projects/hackathon/pacify"
        self.policy_file = f"{self.base_path}/data/policy_sorted.csv"
        self.incidents_file = f"{self.base_path}/data/gun_incidents_2019-2025_incident_level.csv"
        self.output_file = f"{self.base_path}/data_processing/policy_analysis_results.json"
        self.progress_file = f"{self.base_path}/data_processing/policy_analysis_progress.json"
        
        # Load data
        self.policies_df = None
        self.incidents_df = None
        self.mass_shooting_stats = {}
        self.processed_policies = set()  # Track processed policy IDs
        
    def load_data(self):
        """Load policy and incident data."""
        try:
            logger.info("Loading policy data...")
            self.policies_df = pd.read_csv(self.policy_file)
            logger.info(f"Loaded {len(self.policies_df)} policy records")
            
            logger.info("Loading incident data...")
            self.incidents_df = pd.read_csv(self.incidents_file)
            logger.info(f"Loaded {len(self.incidents_df)} incident records")
            
            # Calculate mass shooting statistics by state
            self.calculate_mass_shooting_stats()
            
        except Exception as e:
            logger.error(f"Error loading data: {e}")
            raise
    
    def calculate_mass_shooting_stats(self):
        """Calculate mass shooting statistics by state (4+ casualties definition)."""
        logger.info("Calculating mass shooting statistics...")
        
        # Filter for mass shootings (4+ total victims - killed + injured)
        self.incidents_df['total_victims'] = (
            self.incidents_df['Victims Killed'].fillna(0) + 
            self.incidents_df['Victims Injured'].fillna(0)
        )
        
        mass_shootings = self.incidents_df[self.incidents_df['total_victims'] >= 4]
        
        # Group by state and year
        stats_by_state_year = mass_shootings.groupby(['State', 'year']).size().reset_index(name='count')
        
        # Create comprehensive statistics
        for state in self.incidents_df['State'].unique():
            if pd.isna(state):
                continue
                
            state_mass_shootings = mass_shootings[mass_shootings['State'] == state]
            
            self.mass_shooting_stats[state] = {
                'total_2019_2025': len(state_mass_shootings),
                'by_year': {},
                'avg_per_year': len(state_mass_shootings) / 7,  # 2019-2025 is 7 years
                'total_victims_killed': state_mass_shootings['Victims Killed'].sum(),
                'total_victims_injured': state_mass_shootings['Victims Injured'].sum()
            }
            
            # Break down by year
            for year in range(2019, 2026):
                year_data = state_mass_shootings[state_mass_shootings['year'] == year]
                self.mass_shooting_stats[state]['by_year'][str(year)] = len(year_data)
        
        logger.info(f"Calculated mass shooting stats for {len(self.mass_shooting_stats)} states")
    
    def load_progress(self) -> List[Dict]:
        """Load existing progress from file."""
        if os.path.exists(self.progress_file):
            try:
                with open(self.progress_file, 'r', encoding='utf-8') as f:
                    progress_data = json.load(f)
                    results = progress_data.get('results', [])
                    self.processed_policies = set(progress_data.get('processed_ids', []))
                    logger.info(f"Loaded progress: {len(results)} policies already processed")
                    return results
            except Exception as e:
                logger.error(f"Error loading progress: {e}")
                return []
        return []
    
    def save_progress(self, results: List[Dict]):
        """Save current progress to file."""
        try:
            progress_data = {
                'results': convert_numpy_types(results),
                'processed_ids': list(self.processed_policies),
                'last_updated': datetime.now().isoformat(),
                'total_processed': len(results)
            }
            with open(self.progress_file, 'w', encoding='utf-8') as f:
                json.dump(progress_data, f, indent=2, ensure_ascii=False)
            logger.info(f"Progress saved: {len(results)} policies processed")
        except Exception as e:
            logger.error(f"Error saving progress: {e}")
    
    def get_human_readable_policy_explanation(self, policy_row: pd.Series) -> str:
        """Use Gemini to convert policy content to human-readable explanation."""
        
        policy_content = policy_row['Content']
        policy_class = policy_row['Law Class']
        effect = policy_row['Effect']
        state = policy_row['State']
        effective_date = f"{policy_row.get('Effective Date Year', 'Unknown')}"
        
        prompt = f"""
Please explain this gun policy in simple, clear terms that an average person can understand:

State: {state}
Policy Type: {policy_class}
Effect: {effect} (whether this makes gun laws more restrictive or more permissive)
Effective Date: {effective_date}

Legal Text: {policy_content}

Please provide:
1. A simple explanation of what this policy does in 2-3 sentences
2. Who this policy affects (gun owners, sellers, specific groups, etc.)
3. What practical changes this creates for people

Keep the explanation conversational and avoid legal jargon. Focus on the real-world impact.
"""
        
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Error generating explanation for policy: {e}")
            return f"Error generating explanation: {str(e)}"
    
    def analyze_policy_mass_shooting_impact(self, policy_row: pd.Series, state_stats: Dict) -> str:
        """Use Gemini to analyze potential policy impact on mass shootings."""
        
        policy_class = policy_row['Law Class']
        effect = policy_row['Effect']
        state = policy_row['State']
        effective_year = policy_row.get('Effective Date Year', 'Unknown')
        
        # Format statistics for the prompt
        stats_text = f"""
Mass Shooting Statistics for {state} (2019-2025):
- Total mass shootings: {state_stats.get('total_2019_2025', 0)}
- Average per year: {state_stats.get('avg_per_year', 0):.1f}
- Total victims killed: {state_stats.get('total_victims_killed', 0)}
- Total victims injured: {state_stats.get('total_victims_injured', 0)}

Yearly breakdown:
"""
        
        for year, count in state_stats.get('by_year', {}).items():
            stats_text += f"- {year}: {count} incidents\n"
        
        prompt = f"""
You are a thoughtful policy analyst. Please provide a humble, evidence-based analysis of how this gun policy might theoretically affect mass shooting incidents. Be very careful to note uncertainties and avoid overstating conclusions.

Policy Details:
- State: {state}
- Policy Type: {policy_class}
- Effect: {effect} (more restrictive or permissive)
- Effective Year: {effective_year}

{stats_text}

Please provide:
1. A brief analysis (2-3 sentences) of how this type of policy could theoretically influence mass shooting likelihood
2. Important caveats and limitations to consider
3. What other factors might be more important than this single policy

Be humble and acknowledge that:
- Mass shootings are complex phenomena with many contributing factors
- Single policies rarely have clear, direct effects
- Correlation does not imply causation
- More research would be needed for definitive conclusions

Keep the tone measured and scientific.
"""
        
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Error generating impact analysis: {e}")
            return f"Error generating impact analysis: {str(e)}"
    
    def process_policies(self, limit: Optional[int] = None) -> List[Dict]:
        """Process policies and generate analyses (filtered for 2019-2025)."""
        # Load existing progress
        results = self.load_progress()
        
        # Filter policies to only include 2019-2025
        logger.info("Filtering policies for years 2019-2025...")
        filtered_policies = self.policies_df[
            (self.policies_df['Effective Date Year'] >= 2019) & 
            (self.policies_df['Effective Date Year'] <= 2025)
        ]
        
        # Filter out already processed policies
        unprocessed_policies = filtered_policies[
            ~filtered_policies['Law ID'].isin(self.processed_policies)
        ]
        
        policies_to_process = unprocessed_policies.head(limit) if limit else unprocessed_policies
        total_policies = len(policies_to_process)
        total_original = len(self.policies_df)
        total_remaining = len(unprocessed_policies)
        
        logger.info(f"Filtered from {total_original} to {len(filtered_policies)} policies (2019-2025 only)")
        logger.info(f"Already processed: {len(self.processed_policies)} policies")
        logger.info(f"Remaining to process: {total_remaining} policies")
        logger.info(f"Processing {total_policies} policies in this run...")
        
        for idx, (_, policy_row) in enumerate(policies_to_process.iterrows()):
            try:
                logger.info(f"Processing policy {idx + 1}/{total_policies}: {policy_row['Law ID']} - {policy_row['State']}")
                
                state = policy_row['State']
                state_stats = self.mass_shooting_stats.get(state, {
                    'total_2019_2025': 0,
                    'by_year': {},
                    'avg_per_year': 0,
                    'total_victims_killed': 0,
                    'total_victims_injured': 0
                })
                
                # Generate human-readable explanation
                logger.info("Generating human-readable explanation...")
                human_explanation = self.get_human_readable_policy_explanation(policy_row)
                
                # Add delay to respect API rate limits
                time.sleep(1)
                
                # Generate impact analysis
                logger.info("Generating impact analysis...")
                impact_analysis = self.analyze_policy_mass_shooting_impact(policy_row, state_stats)
                
                # Add delay to respect API rate limits
                time.sleep(1)
                
                # Convert NumPy types to ensure JSON serialization works
                result = convert_numpy_types({
                    'law_id': policy_row['Law ID'],
                    'state': state,
                    'law_class': policy_row['Law Class'],
                    'effect': policy_row['Effect'],
                    'effective_date': f"{policy_row.get('Effective Date Year', '')}-{policy_row.get('Effective Date Month', '')}-{policy_row.get('Effective Date Day', '')}",
                    'original_content': policy_row['Content'],
                    'human_explanation': human_explanation,
                    'mass_shooting_analysis': impact_analysis,
                    'state_mass_shooting_stats': state_stats,
                    'processed_at': datetime.now().isoformat()
                })
                
                results.append(result)
                self.processed_policies.add(policy_row['Law ID'])
                
                # Save progress after each policy
                self.save_progress(results)
                logger.info(f"Saved progress after processing policy {idx + 1}/{total_policies}")
                
            except Exception as e:
                logger.error(f"Error processing policy {policy_row['Law ID']}: {e}")
                # Continue with next policy but don't add to processed set
                continue
        
        return results
    
    def save_results(self, results: List[Dict], filename: Optional[str] = None):
        """Save results to JSON file."""
        output_path = filename or self.output_file
        
        try:
            # Convert NumPy types before saving
            converted_results = convert_numpy_types(results)
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(converted_results, f, indent=2, ensure_ascii=False)
            logger.info(f"Results saved to {output_path}")
        except Exception as e:
            logger.error(f"Error saving results: {e}")
            raise
    
    def generate_summary_report(self, results: List[Dict]) -> Dict:
        """Generate a summary report of the analysis."""
        summary = {
            'total_policies_analyzed': len(results),
            'states_covered': list(set([r['state'] for r in results])),
            'policy_types': {},
            'effects_distribution': {'Restrictive': 0, 'Permissive': 0},
            'analysis_date': datetime.now().isoformat()
        }
        
        for result in results:
            # Count policy types
            policy_type = result['law_class']
            summary['policy_types'][policy_type] = summary['policy_types'].get(policy_type, 0) + 1
            
            # Count effects
            effect = result['effect']
            if effect in summary['effects_distribution']:
                summary['effects_distribution'][effect] += 1
        
        return summary

def main():
    """Main execution function."""
    logger.info("Starting Policy Analysis Tool")
    logger.info("This tool analyzes gun policies and their potential effects on mass shootings")
    logger.info("DISCLAIMER: Results are for research purposes only")
    
    # Get API key
    api_key = get_api_key()
    
    try:
        # Initialize analyzer
        analyzer = PolicyAnalyzer(api_key)
        
        # Load data
        analyzer.load_data()
        
        # Process ALL policies automatically
        logger.info("Processing ALL policies in dataset...")
        results = analyzer.process_policies()  # No limit - process everything
        
        # Generate summary
        summary = analyzer.generate_summary_report(results)
        
        # Save final results
        analyzer.save_results(results)
        
        # Save summary
        summary_file = f"{analyzer.base_path}/data_processing/policy_analysis_summary.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(convert_numpy_types(summary), f, indent=2, ensure_ascii=False)
        
        logger.info("Analysis complete!")
        logger.info(f"Processed {len(results)} policies")
        logger.info(f"Covering {len(summary['states_covered'])} states")
        logger.info(f"Results saved to: {analyzer.output_file}")
        logger.info(f"Summary saved to: {summary_file}")
        
        # Log summary stats
        logger.info("Analysis Summary:")
        logger.info(f"  Restrictive policies: {summary['effects_distribution'].get('Restrictive', 0)}")
        logger.info(f"  Permissive policies: {summary['effects_distribution'].get('Permissive', 0)}")
        logger.info(f"  Policy types analyzed: {len(summary['policy_types'])}")
        
        return True
    
    except KeyboardInterrupt:
        logger.warning("Analysis interrupted by user")
        logger.info("Partial results may be saved in temporary files")
        return False
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        return False

if __name__ == "__main__":
    main()
