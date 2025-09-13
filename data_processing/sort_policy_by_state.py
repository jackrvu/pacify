#!/usr/bin/env python3
"""
Script to sort policy.csv alphabetically by state.
"""

import csv
import os

def sort_policy_by_state():
    """Sort the policy.csv file alphabetically by state."""
    
    input_file = "/Users/jackvu/Desktop/latex_projects/hackathon/pacify/data/policy.csv"
    output_file = "/Users/jackvu/Desktop/latex_projects/hackathon/pacify/data/policy_sorted.csv"
    
    # Read the CSV file
    with open(input_file, 'r', encoding='utf-8') as file:
        reader = csv.reader(file)
        rows = list(reader)
    
    # Separate header from data
    header = rows[0]
    data_rows = rows[1:]
    
    # Sort data rows by state (column index 1)
    # State is in the second column (index 1)
    sorted_data = sorted(data_rows, key=lambda row: row[1] if len(row) > 1 else "")
    
    # Combine header and sorted data
    sorted_rows = [header] + sorted_data
    
    # Write the sorted data to a new file
    with open(output_file, 'w', encoding='utf-8', newline='') as file:
        writer = csv.writer(file)
        writer.writerows(sorted_rows)
    
    print(f"Sorted data written to: {output_file}")
    print(f"Total rows processed: {len(sorted_rows)}")
    print(f"Header row: {header[0:3]}...")  # Show first 3 columns of header
    print(f"First few states after sorting:")
    for i, row in enumerate(sorted_data[:5]):
        if len(row) > 1:
            print(f"  {i+1}. {row[1]}")

if __name__ == "__main__":
    sort_policy_by_state()
