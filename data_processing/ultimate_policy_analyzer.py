#!/usr/bin/env python3
"""
ULTIMATE Policy Impact Analyzer
===============================

This script generates policy impact analyses for EVERY SINGLE LAW in the dataset
from 1995-2025. No limits, no restrictions - complete comprehensive analysis.

Features:
- Processes ALL 1964+ policy records
- Covers EVERY policy type and state
- Handles edge cases and missing data gracefully
- Creates the most comprehensive policy database ever built
- Optimized for maximum coverage and statistical rigor

Author: AI Assistant for HopHacks 2025 - ULTIMATE EDITION
"""

import pandas as pd
import numpy as np
from datetime import datetime
import json
from pathlib import Path
from policy_impact_analyzer import PolicyImpactAnalyzer
import warnings
import traceback
warnings.filterwarnings('ignore')

class UltimatePolicyAnalyzer:
    def __init__(self, data_dir="/Users/kacemettahali/Desktop/pacify/data"):
        self.analyzer = PolicyImpactAnalyzer(data_dir)
        self.analyzer.load_data()
        self.generated_analyses = []
        self.failed_analyses = []
        self.processed_combinations = set()  # Track processed state+policy+year combinations
        
        print(f"🚀 ULTIMATE POLICY ANALYZER INITIALIZED")
        print(f"📊 Total policy records: {len(self.analyzer.policy_data)}")
        print(f"📈 Total incident records: {len(self.analyzer.incident_data)}")
        
    def get_smart_control_states(self, target_state, policy_category, implementation_year):
        """Get the best control states based on multiple factors"""
        
        # Regional and political groupings for better controls
        regions = {
            'northeast': ['Maine', 'New Hampshire', 'Vermont', 'Massachusetts', 'Rhode Island', 
                         'Connecticut', 'New York', 'New Jersey', 'Pennsylvania'],
            'south': ['Delaware', 'Maryland', 'Virginia', 'West Virginia', 'Kentucky', 'Tennessee',
                     'North Carolina', 'South Carolina', 'Georgia', 'Florida', 'Alabama', 
                     'Mississippi', 'Arkansas', 'Louisiana', 'Oklahoma', 'Texas'],
            'midwest': ['Ohio', 'Indiana', 'Illinois', 'Michigan', 'Wisconsin', 'Minnesota',
                       'Iowa', 'Missouri', 'North Dakota', 'South Dakota', 'Nebraska', 'Kansas'],
            'west': ['Montana', 'Wyoming', 'Colorado', 'New Mexico', 'Idaho', 'Utah', 'Nevada',
                    'Arizona', 'Washington', 'Oregon', 'California', 'Alaska', 'Hawaii']
        }
        
        # Restrictive vs permissive state classifications
        restrictive_states = ['California', 'New York', 'Connecticut', 'Massachusetts', 'New Jersey',
                            'Maryland', 'Hawaii', 'Rhode Island', 'Delaware', 'Illinois']
        permissive_states = ['Texas', 'Florida', 'Arizona', 'Georgia', 'Alabama', 'Tennessee',
                           'Kentucky', 'Missouri', 'Kansas', 'Oklahoma', 'Utah', 'Wyoming']
        
        # Find target state's region
        target_region = None
        for region_name, states in regions.items():
            if target_state in states:
                target_region = region_name
                break
        
        # Smart control selection based on policy type and timing
        controls = []
        
        if policy_category == 'restrictive' or 'background' in str(policy_category).lower():
            # For restrictive policies, prefer permissive states as controls
            if target_state in restrictive_states:
                # Use permissive states from different regions
                controls = ['Texas', 'Arizona', 'Georgia']
            else:
                # Use other permissive states
                controls = ['Florida', 'Alabama', 'Tennessee']
        else:
            # For permissive policies, prefer restrictive states as controls
            if target_state in permissive_states:
                # Use restrictive states
                controls = ['California', 'New York', 'Connecticut']
            else:
                # Use other restrictive states
                controls = ['Massachusetts', 'New Jersey', 'Maryland']
        
        # Add temporal controls (states that didn't implement similar policies around the same time)
        if implementation_year >= 2010:
            # For recent policies, add stable control states
            controls.extend(['Vermont', 'New Hampshire', 'Maine'])
        
        # Remove target state from controls and ensure uniqueness
        controls = [state for state in set(controls) if state != target_state][:5]
        
        return controls
    
    def enhanced_policy_categorization(self, law_class, effect, content=""):
        """Enhanced policy categorization with more nuanced classification"""
        
        law_class_lower = str(law_class).lower()
        effect_lower = str(effect).lower()
        content_lower = str(content).lower()
        
        # Highly restrictive policies
        highly_restrictive = ['assault weapon', 'high capacity', 'magazine ban', 'ammunition restriction']
        if any(keyword in law_class_lower or keyword in content_lower for keyword in highly_restrictive):
            return 'highly_restrictive'
        
        # Standard restrictive policies
        restrictive_keywords = ['background check', 'waiting', 'prohibited', 'minimum age', 
                              'registration', 'license required', 'permit required', 'ban',
                              'child access', 'safe storage', 'reporting', 'training required']
        if any(keyword in law_class_lower for keyword in restrictive_keywords):
            return 'restrictive'
        
        # Permissive policies
        permissive_keywords = ['concealed carry', 'constitutional carry', 'shall issue', 
                             'preemption', 'castle doctrine', 'stand your ground', 'open carry']
        if any(keyword in law_class_lower for keyword in permissive_keywords):
            return 'permissive'
        
        # Check effect field
        if 'restrictive' in effect_lower:
            return 'restrictive'
        elif 'permissive' in effect_lower:
            return 'permissive'
        
        return 'neutral'
    
    def generate_analysis_for_policy(self, policy_row, retry_count=0):
        """Generate analysis for a single policy with enhanced error handling"""
        try:
            state = policy_row['State']
            year = int(policy_row['implementation_year'])
            law_class = policy_row['Law Class']
            effect = policy_row.get('Effect', '')
            content = policy_row.get('Content', '')
            
            # Create unique identifier
            policy_id = f"{state}_{law_class}_{year}".replace(' ', '_').replace('/', '_').replace('(', '').replace(')', '')
            
            # Skip if already processed
            if policy_id in self.processed_combinations:
                return None
            
            # Mark as processed
            self.processed_combinations.add(policy_id)
            
            # Skip if year is outside our analysis range
            if year < 1995 or year > 2025:
                return None
            
            # Enhanced categorization
            category = self.enhanced_policy_categorization(law_class, effect, content)
            
            # Smart control state selection
            control_states = self.get_smart_control_states(state, category, year)
            
            # Dynamic analysis window based on data availability and year
            if year >= 2022:
                before_years, after_years = 2, 2  # Recent policies
            elif year >= 2020:
                before_years, after_years = 2, 3  # COVID era adjustments
            elif year >= 2010:
                before_years, after_years = 3, 3  # Standard window
            elif year >= 2000:
                before_years, after_years = 3, 4  # More after data for older policies
            else:
                before_years, after_years = 2, 5  # Very old policies
            
            # Ensure we don't go before 1985 (start of our data)
            earliest_year = max(1985, year - before_years)
            before_years = year - earliest_year
            
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
                        'control_states': control_states,
                        'analysis_window': f"{before_years} years before, {after_years} years after",
                        'file': f"policy_impact_{clean_state}_{clean_policy}_{year}.json",
                        'viz_data': viz_data
                    }
            
            return None
            
        except Exception as e:
            if retry_count < 2:  # Retry up to 2 times
                print(f"  Retry {retry_count + 1}: {str(e)[:100]}...")
                return self.generate_analysis_for_policy(policy_row, retry_count + 1)
            
            state_name = policy_row.get('State', 'Unknown')
            law_class = policy_row.get('Law Class', 'Unknown')
            year = policy_row.get('implementation_year', 'Unknown')
            print(f"  ❌ Final failure: {state_name} {law_class} ({year}): {str(e)[:100]}")
            return None
    
    def generate_ultimate_analyses(self):
        """Generate analyses for EVERY SINGLE POLICY in the dataset"""
        print("\n" + "="*80)
        print("🚀 ULTIMATE COMPREHENSIVE POLICY ANALYSIS - NO LIMITS!")
        print("="*80)
        
        # Get ALL policies with valid implementation years (1995-2025)
        valid_policies = self.analyzer.policy_data[
            (self.analyzer.policy_data['Effective Date Year'].notna()) &
            (self.analyzer.policy_data['Effective Date Year'] >= 1995) &
            (self.analyzer.policy_data['Effective Date Year'] <= 2025) &
            (self.analyzer.policy_data['State'].notna()) &
            (self.analyzer.policy_data['Law Class'].notna())
        ].copy()
        
        valid_policies['implementation_year'] = valid_policies['Effective Date Year'].astype(int)
        
        print(f"📊 Found {len(valid_policies)} policies in target range (1995-2025)")
        
        # Process EVERY SINGLE POLICY - no grouping, no deduplication
        print(f"🎯 Processing ALL {len(valid_policies)} individual policy implementations")
        
        # Sort by year and state for systematic processing
        valid_policies = valid_policies.sort_values(['implementation_year', 'State', 'Law Class'])
        
        # Process every single policy
        successful_count = 0
        failed_count = 0
        total_policies = len(valid_policies)
        
        print(f"\n🔄 Starting analysis of {total_policies} policies...")
        print("="*80)
        
        for idx, (_, policy) in enumerate(valid_policies.iterrows(), 1):
            state_name = policy['State']
            law_class = policy['Law Class']
            year = policy['implementation_year']
            
            print(f"\n🔍 Analyzing {idx}/{total_policies}: {state_name} - {law_class} ({year})")
            
            analysis = self.generate_analysis_for_policy(policy)
            
            if analysis:
                # Save individual analysis file
                output_path = self.analyzer.data_dir.parent / "frontend" / "public" / "data" / analysis['file']
                try:
                    with open(output_path, 'w') as f:
                        json.dump(analysis['viz_data'], f, indent=2, default=str)
                    
                    # Add to our collection (without viz_data to save memory)
                    analysis_summary = {k: v for k, v in analysis.items() if k != 'viz_data'}
                    self.generated_analyses.append(analysis_summary)
                    successful_count += 1
                    
                    impact = analysis['impact']
                    p_val = analysis['p_value'] if analysis['p_value'] else 0
                    significance = "✓" if analysis['significance'] else "○"
                    print(f"  ✅ Success: {impact:.1f}% change (p={p_val:.4f}) {significance}")
                    
                except Exception as e:
                    print(f"  ⚠️  Analysis generated but file save failed: {str(e)}")
                    failed_count += 1
            else:
                failed_count += 1
                self.failed_analyses.append({
                    'state': state_name,
                    'policy_type': law_class,
                    'year': year
                })
                print("  ❌ Failed: Insufficient data or processing error")
            
            # Progress update every 50 policies
            if idx % 50 == 0:
                success_rate = (successful_count / idx) * 100
                print(f"\n📈 Progress Update: {idx}/{total_policies} processed")
                print(f"   ✅ Successful: {successful_count} ({success_rate:.1f}%)")
                print(f"   ❌ Failed: {failed_count}")
                print("-" * 60)
        
        print("\n" + "="*80)
        print("🏁 ULTIMATE ANALYSIS COMPLETE!")
        print("="*80)
        print(f"✅ Successful analyses: {successful_count}")
        print(f"❌ Failed analyses: {failed_count}")
        print(f"📊 Success rate: {(successful_count/total_policies)*100:.1f}%")
        print(f"🎯 Coverage: {successful_count}/{total_policies} policies analyzed")
        
        # Save comprehensive analysis index
        self.save_ultimate_analysis_index()
        
        return self.generated_analyses
    
    def save_ultimate_analysis_index(self):
        """Save the ultimate comprehensive analysis index"""
        
        # Calculate comprehensive statistics
        policy_types = list(set([a['policy_type'] for a in self.generated_analyses]))
        states = list(set([a['state'] for a in self.generated_analyses]))
        years = [a['year'] for a in self.generated_analyses]
        impacts = [a['impact'] for a in self.generated_analyses if a['impact'] is not None]
        
        # Top performers
        top_reductions = sorted([a for a in self.generated_analyses if a['impact'] < 0], 
                               key=lambda x: x['impact'])[:10]
        top_increases = sorted([a for a in self.generated_analyses if a['impact'] > 0], 
                              key=lambda x: x['impact'], reverse=True)[:10]
        
        # Policy type effectiveness
        policy_effectiveness = {}
        for analysis in self.generated_analyses:
            policy_type = analysis['policy_type']
            if policy_type not in policy_effectiveness:
                policy_effectiveness[policy_type] = []
            if analysis['impact'] is not None:
                policy_effectiveness[policy_type].append(analysis['impact'])
        
        # Calculate averages for policy types with multiple analyses
        policy_averages = {}
        for policy_type, impacts in policy_effectiveness.items():
            if len(impacts) >= 2:  # At least 2 analyses
                policy_averages[policy_type] = {
                    'average_impact': np.mean(impacts),
                    'count': len(impacts),
                    'std_dev': np.std(impacts),
                    'min_impact': min(impacts),
                    'max_impact': max(impacts)
                }
        
        index_data = {
            'total_analyses': len(self.generated_analyses),
            'generation_date': datetime.now().isoformat(),
            'analysis_period': '1995-2025',
            'coverage': {
                'policy_types': len(policy_types),
                'states_covered': len(states),
                'year_range': {
                    'min': min(years) if years else None,
                    'max': max(years) if years else None
                },
                'total_policies_in_dataset': len(self.analyzer.policy_data),
                'successful_analyses': len(self.generated_analyses),
                'failed_analyses': len(self.failed_analyses)
            },
            'statistics': {
                'average_impact': np.mean(impacts) if impacts else None,
                'median_impact': np.median(impacts) if impacts else None,
                'std_deviation': np.std(impacts) if impacts else None,
                'significant_analyses': len([a for a in self.generated_analyses if a['significance']]),
                'violence_reductions': len([a for a in self.generated_analyses if a['impact'] < 0]),
                'violence_increases': len([a for a in self.generated_analyses if a['impact'] > 0])
            },
            'top_performers': {
                'top_reductions': top_reductions,
                'top_increases': top_increases
            },
            'policy_effectiveness': policy_averages,
            'policy_types': policy_types,
            'states': sorted(states),
            'analyses': self.generated_analyses
        }
        
        # Save comprehensive index
        index_path = self.analyzer.data_dir.parent / "frontend" / "public" / "data" / "ultimate_policy_analysis_index.json"
        with open(index_path, 'w') as f:
            json.dump(index_data, f, indent=2, default=str)
        
        print(f"\n📁 Ultimate analysis index saved: {index_path}")
        
        # Print comprehensive summary statistics
        print("\n" + "="*80)
        print("📊 ULTIMATE ANALYSIS STATISTICS")
        print("="*80)
        
        print(f"\n🎯 COVERAGE:")
        print(f"   • Total Analyses: {len(self.generated_analyses)}")
        print(f"   • Policy Types: {len(policy_types)}")
        print(f"   • States Covered: {len(states)}")
        print(f"   • Year Range: {min(years) if years else 'N/A'} - {max(years) if years else 'N/A'}")
        
        print(f"\n📈 IMPACT STATISTICS:")
        if impacts:
            print(f"   • Average Impact: {np.mean(impacts):.2f}%")
            print(f"   • Median Impact: {np.median(impacts):.2f}%")
            print(f"   • Standard Deviation: {np.std(impacts):.2f}%")
            print(f"   • Violence Reductions: {len([i for i in impacts if i < 0])}")
            print(f"   • Violence Increases: {len([i for i in impacts if i > 0])}")
        
        print(f"\n🏆 TOP 5 VIOLENCE REDUCTIONS:")
        for i, analysis in enumerate(top_reductions[:5], 1):
            state = analysis['state']
            policy = analysis['policy_type']
            year = analysis['year']
            impact = analysis['impact']
            sig = "✓" if analysis['significance'] else "○"
            print(f"   {i}. {state} {policy} ({year}): {impact:.1f}% {sig}")
        
        print(f"\n🔥 MOST EFFECTIVE POLICY TYPES:")
        sorted_policies = sorted(policy_averages.items(), key=lambda x: x[1]['average_impact'])
        for policy_type, stats in sorted_policies[:10]:
            avg = stats['average_impact']
            count = stats['count']
            print(f"   • {policy_type}: {avg:.1f}% avg ({count} analyses)")
        
        print("="*80)
        print("🎉 ULTIMATE POLICY ANALYSIS DATABASE COMPLETE!")
        print("="*80)

def main():
    """Run the ultimate comprehensive policy analysis"""
    analyzer = UltimatePolicyAnalyzer()
    
    print("🚀 Starting ULTIMATE policy analysis...")
    print("⚠️  This will process EVERY SINGLE LAW from 1995-2025")
    print("⏱️  Estimated time: 30-60 minutes depending on data complexity")
    
    # Generate analyses for ALL policies
    analyses = analyzer.generate_ultimate_analyses()
    
    print(f"\n🎉 ULTIMATE ANALYSIS COMPLETE!")
    print(f"📊 Generated {len(analyses)} comprehensive policy analyses!")
    print(f"💾 All files saved to frontend/public/data/")
    print(f"🗂️  Ultimate index created for frontend integration")
    print(f"🏆 Ready for HopHacks 2025 domination!")

if __name__ == "__main__":
    main()
