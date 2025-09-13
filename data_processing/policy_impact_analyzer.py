#!/usr/bin/env python3
"""
Policy Impact Analyzer for Gun Violence Data
============================================

This script analyzes the impact of specific gun policies on gun violence rates
by comparing before/after periods and using control states for comparison.

Features:
- Before/after analysis for specific policies
- Control state comparisons
- Statistical significance testing
- Population-adjusted rates
- Multiple policy type support

Author: AI Assistant for HopHacks 2025
"""

import pandas as pd
import numpy as np
from datetime import datetime
import json
from scipy import stats
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

class PolicyImpactAnalyzer:
    def __init__(self, data_dir="/Users/kacemettahali/Desktop/pacify/data"):
        self.data_dir = Path(data_dir)
        self.policy_data = None
        self.incident_data = None
        self.population_data = None
        
        # State name mapping
        self.state_name_mapping = {
            'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
            'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
            'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
            'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
            'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
            'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
            'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
            'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
            'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
            'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
            'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
            'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
            'Wisconsin': 'WI', 'Wyoming': 'WY'
        }
        
        # Reverse mapping
        self.state_abbrev_mapping = {v: k for k, v in self.state_name_mapping.items()}
        
    def load_data(self):
        """Load policy and incident data"""
        print("Loading policy data...")
        self.policy_data = pd.read_csv(self.data_dir / "policy_sorted.csv")
        
        print("Loading incident data...")
        # Load historical data (1985-2018)
        historical_data = pd.read_csv(self.data_dir / "US_gun_deaths_1985-2018_with_coordinates.csv")
        
        # Load recent data (2019-2025) 
        recent_data = pd.read_csv(self.data_dir / "gun_incidents_2019-2025_incident_level.csv")
        
        # Normalize and combine datasets
        self.incident_data = self._normalize_incident_data(historical_data, recent_data)
        
        print(f"Loaded {len(self.policy_data)} policy records")
        print(f"Loaded {len(self.incident_data)} incident records")
        
        # Load population data (simplified - we'll use approximate values)
        self._load_population_estimates()
        
    def _normalize_incident_data(self, historical, recent):
        """Normalize different incident data formats"""
        
        # Normalize historical data (victim-level to incident-level approximation)
        historical_incidents = historical.groupby(['year', 'state', 'incident_id']).agg({
            'victim_age': 'count',  # Count of victims (casualties)
            'Latitude': 'first',
            'Longitude': 'first'
        }).reset_index()
        historical_incidents.rename(columns={'victim_age': 'casualties'}, inplace=True)
        historical_incidents['source'] = 'historical'
        
        # Normalize recent data 
        recent_incidents = recent.copy()
        recent_incidents['casualties'] = (
            recent_incidents['Victims Killed'].fillna(0) + 
            recent_incidents['Victims Injured'].fillna(0)
        )
        recent_incidents = recent_incidents[['year', 'State', 'casualties']].copy()
        # Convert full state names to abbreviations to match historical data
        recent_incidents['state'] = recent_incidents['State'].map(self.state_name_mapping)
        recent_incidents = recent_incidents.dropna(subset=['state'])  # Remove unmapped states
        recent_incidents['source'] = 'recent'
        
        # Combine datasets
        combined = pd.concat([
            historical_incidents[['year', 'state', 'casualties', 'source']],
            recent_incidents[['year', 'state', 'casualties', 'source']]
        ], ignore_index=True)
        
        return combined
    
    def _load_population_estimates(self):
        """Load/create population estimates for rate calculations"""
        # Simplified population data - in production, you'd load actual Census data
        # Using state abbreviations to match our incident data
        state_populations_2020 = {
            'CA': 39538223, 'TX': 29145505, 'FL': 21538187,
            'NY': 20201249, 'PA': 13002700, 'IL': 12812508,
            'OH': 11799448, 'GA': 10711908, 'NC': 10439388,
            'MI': 10037261, 'NJ': 9288994, 'VA': 8631393,
            'WA': 7705281, 'AZ': 7151502, 'MA': 7001399,
            'TN': 6910840, 'IN': 6785528, 'MD': 6177224,
            'MO': 6196540, 'WI': 5893718, 'CO': 5773714,
            'MN': 5737915, 'SC': 5118425, 'AL': 5024279,
            'LA': 4657757, 'KY': 4505836, 'OR': 4237256,
            'OK': 3959353, 'CT': 3605944, 'UT': 3271616,
            'IA': 3190369, 'NV': 3104614, 'AR': 3011524,
            'MS': 2961279, 'KS': 2937880, 'NM': 2117522,
            'NE': 1961504, 'WV': 1793716, 'ID': 1839106,
            'HI': 1455271, 'NH': 1377529, 'ME': 1395722,
            'MT': 1084225, 'RI': 1097379, 'DE': 989948,
            'SD': 886667, 'ND': 779094, 'AK': 733391,
            'VT': 643077, 'WY': 576851
        }
        
        # Convert to DataFrame and estimate for other years (simple linear interpolation)
        pop_df = pd.DataFrame(list(state_populations_2020.items()), 
                             columns=['state', 'population_2020'])
        
        # Create population estimates for all years (simplified)
        years = range(1985, 2026)
        pop_data = []
        
        for state_abbrev, pop_2020 in state_populations_2020.items():
            for year in years:
                # Simple growth model (very approximate)
                growth_factor = 1 + (year - 2020) * 0.007  # ~0.7% annual growth
                estimated_pop = pop_2020 * growth_factor
                pop_data.append({
                    'state': state_abbrev,
                    'year': year,
                    'population': max(estimated_pop, pop_2020 * 0.8)  # Minimum 80% of 2020
                })
        
        self.population_data = pd.DataFrame(pop_data)
    
    def find_policy_implementations(self, policy_type, state=None):
        """Find when specific policies were implemented"""
        policy_df = self.policy_data.copy()
        
        # Filter by policy type
        if policy_type.lower() == 'assault_weapon_ban':
            mask = policy_df['Law Class'].str.contains('assault weapons ban', case=False, na=False)
        elif policy_type.lower() == 'background_check':
            mask = policy_df['Law Class'].str.contains('background check', case=False, na=False)
        elif policy_type.lower() == 'red_flag':
            mask = (policy_df['Law Class'].str.contains('erpo', case=False, na=False) |
                   policy_df['Law Class Subtype'].str.contains('extreme risk', case=False, na=False))
        else:
            mask = policy_df['Law Class'].str.contains(policy_type, case=False, na=False)
        
        policy_implementations = policy_df[mask].copy()
        
        if state:
            policy_implementations = policy_implementations[
                policy_implementations['State'].str.contains(state, case=False, na=False)
            ]
        
        # Clean up dates
        policy_implementations['implementation_year'] = pd.to_numeric(
            policy_implementations['Effective Date Year'], errors='coerce'
        )
        
        return policy_implementations[['State', 'Law Class', 'Law Class Subtype', 
                                     'implementation_year', 'Effect', 'Content']].dropna()
    
    def calculate_incident_rates(self, state, years):
        """Calculate incident rates per 100k population for given years"""
        state_incidents = self.incident_data[
            (self.incident_data['state'] == state) & 
            (self.incident_data['year'].isin(years))
        ]
        
        state_population = self.population_data[
            (self.population_data['state'] == state) & 
            (self.population_data['year'].isin(years))
        ]
        
        # Group by year and calculate rates
        annual_data = []
        for year in years:
            year_incidents = state_incidents[state_incidents['year'] == year]
            year_population = state_population[state_population['year'] == year]
            
            if len(year_population) > 0:
                population = year_population.iloc[0]['population']
                total_incidents = len(year_incidents)
                total_casualties = year_incidents['casualties'].sum()
                
                annual_data.append({
                    'year': year,
                    'incidents': total_incidents,
                    'casualties': total_casualties,
                    'population': population,
                    'incident_rate': (total_incidents / population) * 100000,
                    'casualty_rate': (total_casualties / population) * 100000
                })
        
        return pd.DataFrame(annual_data)
    
    def analyze_policy_impact(self, policy_type, state, implementation_year, 
                            before_years=3, after_years=3, control_states=None):
        """Analyze the impact of a specific policy implementation"""
        
        print(f"\nAnalyzing {policy_type} impact in {state} (implemented {implementation_year})")
        
        # Convert state name to abbreviation if needed
        state_abbrev = self.state_name_mapping.get(state, state)
        
        # Define analysis periods
        before_period = list(range(implementation_year - before_years, implementation_year))
        after_period = list(range(implementation_year + 1, implementation_year + after_years + 1))
        
        print(f"Before period: {before_period}")
        print(f"After period: {after_period}")
        print(f"Using state abbreviation: {state_abbrev}")
        
        # Calculate rates for treatment state
        before_data = self.calculate_incident_rates(state_abbrev, before_period)
        after_data = self.calculate_incident_rates(state_abbrev, after_period)
        
        if len(before_data) == 0 or len(after_data) == 0:
            print(f"Insufficient data for {state}")
            return None
        
        # Calculate average rates
        before_rate = before_data['incident_rate'].mean()
        after_rate = after_data['incident_rate'].mean()
        change_rate = ((after_rate - before_rate) / before_rate) * 100
        
        results = {
            'state': state,
            'policy_type': policy_type,
            'implementation_year': implementation_year,
            'before_rate': before_rate,
            'after_rate': after_rate,
            'change_percent': change_rate,
            'before_data': before_data,
            'after_data': after_data
        }
        
        # Add control state analysis if provided
        if control_states:
            control_results = []
            for control_state in control_states:
                # Convert control state name to abbreviation if needed
                control_abbrev = self.state_name_mapping.get(control_state, control_state)
                control_before = self.calculate_incident_rates(control_abbrev, before_period)
                control_after = self.calculate_incident_rates(control_abbrev, after_period)
                
                if len(control_before) > 0 and len(control_after) > 0:
                    control_before_rate = control_before['incident_rate'].mean()
                    control_after_rate = control_after['incident_rate'].mean()
                    control_change = ((control_after_rate - control_before_rate) / control_before_rate) * 100
                    
                    control_results.append({
                        'state': control_state,
                        'before_rate': control_before_rate,
                        'after_rate': control_after_rate,
                        'change_percent': control_change
                    })
            
            results['control_states'] = control_results
            
            # Calculate difference-in-differences
            if control_results:
                avg_control_change = np.mean([c['change_percent'] for c in control_results])
                results['diff_in_diff'] = change_rate - avg_control_change
                print(f"Difference-in-differences: {results['diff_in_diff']:.2f}%")
        
        # Statistical significance test
        if len(before_data) > 1 and len(after_data) > 1:
            t_stat, p_value = stats.ttest_ind(before_data['incident_rate'], after_data['incident_rate'])
            results['t_statistic'] = t_stat
            results['p_value'] = p_value
            results['statistically_significant'] = p_value < 0.05
        
        print(f"Before rate: {before_rate:.2f} incidents per 100k")
        print(f"After rate: {after_rate:.2f} incidents per 100k")
        print(f"Change: {change_rate:.2f}%")
        
        return results
    
    def create_visualization_data(self, analysis_results):
        """Create data structure for frontend visualization"""
        if not analysis_results:
            return None
        
        # Helper function to handle infinite/NaN values
        def safe_round(value, decimals=2):
            if value is None or not np.isfinite(value):
                return None
            return round(value, decimals)
        
        viz_data = {
            'policy_info': {
                'state': analysis_results['state'],
                'policy_type': analysis_results['policy_type'],
                'implementation_year': analysis_results['implementation_year']
            },
            'impact_summary': {
                'before_rate': safe_round(analysis_results['before_rate']),
                'after_rate': safe_round(analysis_results['after_rate']),
                'change_percent': safe_round(analysis_results['change_percent']),
                'statistically_significant': analysis_results.get('statistically_significant', False),
                'p_value': safe_round(analysis_results.get('p_value', None), 6)
            },
            'time_series_data': {
                'before_period': analysis_results['before_data'][['year', 'incident_rate']].to_dict('records'),
                'after_period': analysis_results['after_data'][['year', 'incident_rate']].to_dict('records')
            }
        }
        
        # Add control state data if available
        if 'control_states' in analysis_results:
            viz_data['control_comparison'] = analysis_results['control_states']
            viz_data['diff_in_diff'] = safe_round(analysis_results.get('diff_in_diff', 0))
        
        return viz_data
    
    def save_analysis_results(self, results, filename):
        """Save analysis results to JSON for frontend consumption"""
        output_path = self.data_dir.parent / "frontend" / "public" / "data" / filename
        
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"Results saved to: {output_path}")

def main():
    """Run policy impact analysis examples"""
    analyzer = PolicyImpactAnalyzer()
    analyzer.load_data()
    
    # Example 1: California Assault Weapon Ban
    print("="*60)
    print("CALIFORNIA ASSAULT WEAPON BAN ANALYSIS")
    print("="*60)
    
    ca_assault_results = analyzer.analyze_policy_impact(
        policy_type='assault_weapon_ban',
        state='California',
        implementation_year=1990,  # California's state law
        before_years=3,
        after_years=3,
        control_states=['Texas', 'Arizona', 'Nevada']
    )
    
    if ca_assault_results:
        ca_viz_data = analyzer.create_visualization_data(ca_assault_results)
        analyzer.save_analysis_results(ca_viz_data, 'policy_impact_ca_assault_ban.json')
    
    # Example 2: Background Check Analysis
    print("\n" + "="*60)
    print("BACKGROUND CHECK ANALYSIS")
    print("="*60)
    
    # Find states with background check implementations
    bg_check_policies = analyzer.find_policy_implementations('background_check')
    print(f"Found {len(bg_check_policies)} background check policy implementations")
    
    if len(bg_check_policies) > 0:
        # Analyze a few examples
        for idx, policy in bg_check_policies.head(3).iterrows():
            if pd.notna(policy['implementation_year']) and policy['implementation_year'] >= 1990:
                bg_results = analyzer.analyze_policy_impact(
                    policy_type='background_check',
                    state=policy['State'],
                    implementation_year=int(policy['implementation_year']),
                    before_years=3,
                    after_years=3,
                    control_states=['Texas', 'Florida']  # States with looser gun laws
                )
                
                if bg_results:
                    bg_viz_data = analyzer.create_visualization_data(bg_results)
                    filename = f"policy_impact_{policy['State'].lower().replace(' ', '_')}_bg_check.json"
                    analyzer.save_analysis_results(bg_viz_data, filename)
    
    print("\nAnalysis complete! Check frontend/public/data/ for visualization data files.")

if __name__ == "__main__":
    main()
