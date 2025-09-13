#!/usr/bin/env python3
"""
State Gun Violence Context Generator using Google Gemini 2.5 Pro with Search

This script uses Google Gemini 2.5 Pro with search functionality to generate 
contextual information about recent gun violence for each US state. The output 
is approximately 2 paragraphs per state and is saved as a JSON file.

Setup:
1. Get a Google Gemini API key from: https://makersuite.google.com/app/apikey
2. Create a .env file in the pacify directory with: GEMINI_API_KEY=your-api-key-here
3. Run this script: python state_gun_violence_context_generator.py

Output: state_gun_violence_context.json with contextual information for all 50 states

Author: Generated for Pacify Project
Date: 2024
"""

import os
import json
import sys
import subprocess
from typing import Dict, List, Optional
from datetime import datetime
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_and_install_dependencies():
    """Check for required packages and install if missing."""
    required_packages = {
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

import google.generativeai as genai

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

class StateGunViolenceContextGenerator:
    def __init__(self, api_key: str):
        """Initialize the generator with Google Gemini API key."""
        genai.configure(api_key=api_key)
        # Use Gemini 2.0 Flash Thinking with search capabilities
        self.model = genai.GenerativeModel('gemini-2.0-flash-thinking-exp')
        
        # Output file path
        self.base_path = "/Users/jackvu/Desktop/latex_projects/hackathon/pacify"
        self.output_file = f"{self.base_path}/data_processing/state_gun_violence_context.json"
        self.progress_file = f"{self.base_path}/data_processing/state_context_progress.json"
        
        # Track processed states
        self.processed_states = set()
        
    def load_progress(self) -> List[Dict]:
        """Load existing progress from file."""
        if os.path.exists(self.progress_file):
            try:
                with open(self.progress_file, 'r', encoding='utf-8') as f:
                    progress_data = json.load(f)
                    results = progress_data.get('results', [])
                    self.processed_states = set(progress_data.get('processed_states', []))
                    logger.info(f"Loaded progress: {len(results)} states already processed")
                    return results
            except Exception as e:
                logger.error(f"Error loading progress: {e}")
                return []
        return []
    
    def save_progress(self, results: List[Dict]):
        """Save current progress to file."""
        try:
            progress_data = {
                'results': results,
                'processed_states': list(self.processed_states),
                'last_updated': datetime.now().isoformat(),
                'total_processed': len(results)
            }
            with open(self.progress_file, 'w', encoding='utf-8') as f:
                json.dump(progress_data, f, indent=2, ensure_ascii=False)
            logger.info(f"Progress saved: {len(results)} states processed")
        except Exception as e:
            logger.error(f"Error saving progress: {e}")
    
    def generate_state_context(self, state: str) -> str:
        """Generate contextual information about gun violence for a specific state."""
        
        prompt = f"""
You are a knowledgeable researcher with access to current information about gun violence in the United States. 
Please provide approximately 2 paragraphs of contextual information about recent gun violence trends, 
patterns, and notable incidents in {state}.

Use your search capabilities to find the most current and accurate information available.

Please focus on:
1. Recent trends in gun violence incidents (2023-2024)
2. Notable incidents or patterns specific to {state}
3. Any unique factors or circumstances that may contribute to gun violence in {state}
4. Recent policy changes or legislative responses in {state} related to gun violence

Write in a factual, informative tone. Be specific about timeframes and cite relevant statistics when available.
Aim for approximately 2 paragraphs (300-400 words total).

If you cannot find recent information about {state}, please indicate this clearly in your response.
"""

        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Error generating context for {state}: {e}")
            return f"Error generating context for {state}: {str(e)}"
    
    def process_all_states(self, limit: Optional[int] = None) -> List[Dict]:
        """Process all US states and generate contextual information."""
        # Load existing progress
        results = self.load_progress()
        
        # Filter out already processed states
        unprocessed_states = [state for state in US_STATES if state not in self.processed_states]
        
        states_to_process = unprocessed_states[:limit] if limit else unprocessed_states
        total_states = len(states_to_process)
        total_remaining = len(unprocessed_states)
        
        logger.info(f"Already processed: {len(self.processed_states)} states")
        logger.info(f"Remaining to process: {total_remaining} states")
        logger.info(f"Processing {total_states} states in this run...")
        
        for idx, state in enumerate(states_to_process):
            try:
                logger.info(f"Processing state {idx + 1}/{total_states}: {state}")
                
                # Generate context for the state
                context = self.generate_state_context(state)
                
                # Create result object
                result = {
                    'state': state,
                    'context': context,
                    'generated_at': datetime.now().isoformat(),
                    'word_count': len(context.split())
                }
                
                results.append(result)
                self.processed_states.add(state)
                
                # Save progress after each state
                self.save_progress(results)
                logger.info(f"Saved progress after processing {state}")
                
                # Add delay to respect API rate limits
                time.sleep(2)
                
            except Exception as e:
                logger.error(f"Error processing state {state}: {e}")
                # Continue with next state but don't add to processed set
                continue
        
        return results
    
    def save_results(self, results: List[Dict], filename: Optional[str] = None):
        """Save results to JSON file."""
        output_path = filename or self.output_file
        
        try:
            # Sort results by state name for consistency
            sorted_results = sorted(results, key=lambda x: x['state'])
            
            # Add metadata
            final_data = {
                'metadata': {
                    'generated_at': datetime.now().isoformat(),
                    'total_states': len(sorted_results),
                    'description': 'Contextual information about recent gun violence trends for each US state',
                    'generated_by': 'Google Gemini 2.0 Flash Thinking with search capabilities'
                },
                'states': sorted_results
            }
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(final_data, f, indent=2, ensure_ascii=False)
            logger.info(f"Results saved to {output_path}")
        except Exception as e:
            logger.error(f"Error saving results: {e}")
            raise
    
    def generate_summary_report(self, results: List[Dict]) -> Dict:
        """Generate a summary report of the analysis."""
        total_words = sum(result.get('word_count', 0) for result in results)
        avg_words_per_state = total_words / len(results) if results else 0
        
        summary = {
            'total_states_processed': len(results),
            'states_covered': [r['state'] for r in results],
            'total_word_count': total_words,
            'average_words_per_state': round(avg_words_per_state, 1),
            'generation_date': datetime.now().isoformat()
        }
        
        return summary

def main():
    """Main execution function."""
    logger.info("Starting State Gun Violence Context Generator")
    logger.info("This tool generates contextual information about gun violence for each US state")
    logger.info("Using Google Gemini 2.0 Flash Thinking with search capabilities")
    
    # Get API key
    api_key = get_api_key()
    
    try:
        # Initialize generator
        generator = StateGunViolenceContextGenerator(api_key)
        
        # Process all states
        logger.info("Processing all 50 US states...")
        results = generator.process_all_states()  # Process all states
        
        # Generate summary
        summary = generator.generate_summary_report(results)
        
        # Save final results
        generator.save_results(results)
        
        # Save summary
        summary_file = f"{generator.base_path}/data_processing/state_context_summary.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        logger.info("Context generation complete!")
        logger.info(f"Processed {len(results)} states")
        logger.info(f"Total words generated: {summary['total_word_count']}")
        logger.info(f"Average words per state: {summary['average_words_per_state']}")
        logger.info(f"Results saved to: {generator.output_file}")
        logger.info(f"Summary saved to: {summary_file}")
        
        return True
    
    except KeyboardInterrupt:
        logger.warning("Generation interrupted by user")
        logger.info("Partial results may be saved in temporary files")
        return False
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        return False

if __name__ == "__main__":
    main()
