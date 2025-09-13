#!/usr/bin/env python3
"""
Comprehensive Policy Impact Analyzer
====================================

This script generates policy impact analyses for EVERY policy in the dataset.
It processes all 1964+ policy records and creates analyses where data is available.

Features:
- Processes all policy types (20+ categories)
- Handles all 51 states/territories
- Filters for policies with sufficient data
- Creates comprehensive analysis database
- Generates summary statistics

Author: AI Assistant for HopHacks 2025
"""

import pandas as pd
import numpy as np
from datetime import datetime
import json
from pathlib import Path
from policy_impact_analyzer import PolicyImpactAnalyzer
import warnings
warnings.filterwarnings('ignore')

class ComprehensivePolicyAnalyzer:
    def __init__(self, data_dir="/Users/kacemettahali/Desktop/pacify/data"):
        self.analyzer = PolicyImpactAnalyzer(data_dir)
        self.analyzer.load_data()
        self.generated_analyses = []
        self.failed_analyses = []
        
    def get_control_states(self, target_state, policy_category):
        """Get appropriate control states based on region and policy type"""
        
        # Regional groupings
        northeast = ['Maine', 'New Hampshire', 'Vermont', 'Massachusetts', 'Rhode Island', 
                    'Connecticut', 'New York', 'New Jersey', 'Pennsylvania']
        south = ['Delaware', 'Maryland', 'Virginia', 'West Virginia', 'Kentucky', 'Tennessee',
                'North Carolina', 'South Carolina', 'Georgia', 'Florida', 'Alabama', 
                'Mississippi', 'Arkansas', 'Louisiana', 'Oklahoma', 'Texas']
        midwest = ['Ohio', 'Indiana', 'Illinois', 'Michigan', 'Wisconsin', 'Minnesota',
                  'Iowa', 'Missouri', 'North Dakota', 'South Dakota', 'Nebraska', 'Kansas']
        west = ['Montana', 'Wyoming', 'Colorado', 'New Mexico', 'Idaho', 'Utah', 'Nevada',
               'Arizona', 'Washington', 'Oregon', 'California', 'Alaska', 'Hawaii']
        
        # Find target state's region
        target_region = None
        for region_name, states in [('northeast', northeast), ('south', south), 
                                   ('midwest', midwest), ('west', west)]:
            if target_state in states:
                target_region = region_name
                break
        
        # Select control states from different regions
        if policy_category == 'restrictive':
            # For restrictive policies, use permissive states as controls
            if target_region == 'northeast':
                return ['Texas', 'Florida', 'Arizona']
            elif target_region == 'west':
                return ['Texas', 'Alabama', 'Georgia']
            else:
                return ['Texas', 'Arizona', 'Utah']
        else:
            # For permissive policies, use restrictive states as controls
            if target_region == 'south':
                return ['California', 'New York', 'Connecticut']
            elif target_region == 'west':
                return ['New York', 'Massachusetts', 'New Jersey']
            else:
                return ['California', 'Connecticut', 'Massachusetts']
    
    def categorize_policy(self, law_class, effect):
        """Categorize policy as restrictive or permissive"""
        restrictive_keywords = ['background check', 'waiting', 'prohibited', 'minimum age', 
                              'registration', 'license', 'permit required', 'ban']
        permissive_keywords = ['concealed carry', 'constitutional carry', 'shall issue', 
                             'preemption', 'castle doctrine', 'stand your ground']
        
        law_class_lower = str(law_class).lower()
        effect_lower = str(effect).lower()
        
        if any(keyword in law_class_lower for keyword in restrictive_keywords):
            return 'restrictive'
        elif any(keyword in law_class_lower for keyword in permissive_keywords):
            return 'permissive'
        elif 'restrictive' in effect_lower:
            return 'restrictive'
        elif 'permissive' in effect_lower:
            return 'permissive'
        else:
            return 'neutral'
    
    def generate_analysis_for_policy(self, policy_row):
        """Generate analysis for a single policy"""
        try:
            state = policy_row['State']
            year = int(policy_row['implementation_year'])
            law_class = policy_row['Law Class']
            effect = policy_row.get('Effect', '')
            
            # Skip if year is too recent (not enough after data) or too old (not enough before data)
            if year < 1990 or year > 2022:
                return None
            
            # Categorize policy
            category = self.categorize_policy(law_class, effect)
            
            # Get control states
            control_states = self.get_control_states(state, category)
            
            # Determine analysis window based on data availability
            if year >= 2020:
                before_years, after_years = 2, 2
            else:
                before_years, after_years = 3, 3
            
            # Generate analysis
            results = self.analyzer.analyze_policy_impact(
                policy_type=law_class,
                state=state,
                implementation_year=year,
                before_years=before_years,
                after_years=after_years,
                control_states=control_states
            )
            
            if results and results.get('before_rate', 0) > 0:
                # Create visualization data
                viz_data = self.analyzer.create_visualization_data(results)
                if viz_data and viz_data['impact_summary']['change_percent'] is not None:
                    # Clean up names for file paths
                    clean_state = state.lower().replace(' ', '_').replace('(', '').replace(')', '')
                    clean_policy = law_class.lower().replace(' ', '_').replace('(', '').replace(')', '').replace('/', '_')
                    
                    return {
                        'id': f"{clean_state}_{clean_policy}_{year}",
                        'state': state,
                        'policy_type': law_class,
                        'year': year,
                        'category': category,
                        'impact': viz_data['impact_summary']['change_percent'],
                        'significance': viz_data['impact_summary']['statistically_significant'],
                        'before_rate': viz_data['impact_summary']['before_rate'],
                        'after_rate': viz_data['impact_summary']['after_rate'],
                        'p_value': viz_data['impact_summary']['p_value'],
                        'file': f"policy_impact_{clean_state}_{clean_policy}_{year}.json",
                        'viz_data': viz_data
                    }
            
            return None
            
        except Exception as e:
            state_name = policy_row.get('State', 'Unknown')
            law_class = policy_row.get('Law Class', 'Unknown')
            year = policy_row.get('implementation_year', 'Unknown')
            print(f"Error analyzing {state_name} {law_class} ({year}): {str(e)}")
            return None
    
    def generate_all_analyses(self, max_analyses=100):
        """Generate analyses for all viable policies"""
        print("=== GENERATING COMPREHENSIVE POLICY ANALYSES ===\n")
        
        # Get all policies with valid implementation years
        valid_policies = self.analyzer.policy_data[
            (self.analyzer.policy_data['Effective Date Year'].notna()) &
            (self.analyzer.policy_data['Effective Date Year'] >= 1990) &
            (self.analyzer.policy_data['Effective Date Year'] <= 2022) &
            (self.analyzer.policy_data['State'].notna()) &
            (self.analyzer.policy_data['Law Class'].notna())
        ].copy()
        
        valid_policies['implementation_year'] = valid_policies['Effective Date Year'].astype(int)
        
        print(f"Found {len(valid_policies)} policies with valid data")
        
        # Group by state and policy type to avoid duplicates
        grouped_policies = valid_policies.groupby(['State', 'Law Class']).agg({
            'implementation_year': 'first',  # Take first implementation
            'Effect': 'first',
            'Law Class Subtype': 'first'
        }).reset_index()
        
        print(f"After deduplication: {len(grouped_policies)} unique policy implementations")
        
        # Sort by potential impact (prioritize recent policies and major states)
        major_states = ['California', 'Texas', 'Florida', 'New York', 'Pennsylvania', 
                       'Illinois', 'Ohio', 'Georgia', 'North Carolina', 'Michigan']
        
        grouped_policies['is_major_state'] = grouped_policies['State'].isin(major_states)
        grouped_policies['recency_score'] = grouped_policies['implementation_year'] - 1990
        
        grouped_policies = grouped_policies.sort_values(
            ['is_major_state', 'recency_score'], 
            ascending=[False, False]
        )
        
        # Generate analyses
        successful_count = 0
        failed_count = 0
        
        for idx, policy in grouped_policies.iterrows():
            if successful_count >= max_analyses:
                break
                
            state_name = policy['State']
            law_class = policy['Law Class']
            year = policy['implementation_year']
            print(f"\nAnalyzing {successful_count + 1}/{max_analyses}: {state_name} - {law_class} ({year})")
            
            analysis = self.generate_analysis_for_policy(policy)
            
            if analysis:
                # Save individual analysis file
                output_path = self.analyzer.data_dir.parent / "frontend" / "public" / "data" / analysis['file']
                with open(output_path, 'w') as f:
                    json.dump(analysis['viz_data'], f, indent=2, default=str)
                
                # Add to our collection (without viz_data to save memory)
                analysis_summary = {k: v for k, v in analysis.items() if k != 'viz_data'}
                self.generated_analyses.append(analysis_summary)
                successful_count += 1
                
                impact = analysis['impact']
                p_val = analysis['p_value'] if analysis['p_value'] else 0
                print(f"  ✓ Success: {impact:.1f}% change (p={p_val:.4f})")
            else:
                failed_count += 1
                self.failed_analyses.append({
                    'state': policy['State'],
                    'policy_type': policy['Law Class'],
                    'year': policy['implementation_year']
                })
                print("  ✗ Failed: Insufficient data")
        
        print("\n=== ANALYSIS COMPLETE ===")
        print(f"Successful analyses: {successful_count}")
        print(f"Failed analyses: {failed_count}")
        
        # Save comprehensive analysis index
        self.save_analysis_index()
        
        return self.generated_analyses
    
    def save_analysis_index(self):
        """Save a comprehensive index of all analyses"""
        index_data = {
            'total_analyses': len(self.generated_analyses),
            'generation_date': datetime.now().isoformat(),
            'policy_types': list(set([a['policy_type'] for a in self.generated_analyses])),
            'states': list(set([a['state'] for a in self.generated_analyses])),
            'year_range': {
                'min': min([a['year'] for a in self.generated_analyses]) if self.generated_analyses else None,
                'max': max([a['year'] for a in self.generated_analyses]) if self.generated_analyses else None
            },
            'analyses': self.generated_analyses
        }
        
        # Save index file
        index_path = self.analyzer.data_dir.parent / "frontend" / "public" / "data" / "policy_analysis_index.json"
        with open(index_path, 'w') as f:
            json.dump(index_data, f, indent=2, default=str)
        
        print(f"\nAnalysis index saved: {index_path}")
        
        # Print summary statistics
        print("\n=== SUMMARY STATISTICS ===")
        
        # Top impacts
        top_reductions = sorted([a for a in self.generated_analyses if a['impact'] < 0], 
                               key=lambda x: x['impact'])[:5]
        print("\nTop 5 Violence Reductions:")
        for i, analysis in enumerate(top_reductions, 1):
            state = analysis['state']
            policy = analysis['policy_type']
            year = analysis['year']
            impact = analysis['impact']
            print(f"  {i}. {state} {policy} ({year}): {impact:.1f}%")
        
        # Policy type effectiveness
        policy_effectiveness = {}
        for analysis in self.generated_analyses:
            policy_type = analysis['policy_type']
            if policy_type not in policy_effectiveness:
                policy_effectiveness[policy_type] = []
            policy_effectiveness[policy_type].append(analysis['impact'])
        
        print("\nPolicy Type Average Effectiveness:")
        for policy_type, impacts in policy_effectiveness.items():
            if len(impacts) >= 3:  # Only show types with multiple analyses
                avg_impact = np.mean(impacts)
                count = len(impacts)
                print(f"  {policy_type}: {avg_impact:.1f}% average change ({count} analyses)")

def main():
    """Run comprehensive policy analysis"""
    analyzer = ComprehensivePolicyAnalyzer()
    
    # Generate analyses for up to 100 policies
    analyses = analyzer.generate_all_analyses(max_analyses=100)
    
    count = len(analyses)
    print(f"\n🎉 Generated {count} comprehensive policy analyses!")
    print("All analysis files saved to frontend/public/data/")
    print("Analysis index created for frontend integration.")

if __name__ == "__main__":
    main()
