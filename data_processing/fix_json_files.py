#!/usr/bin/env python3
"""
JSON File Fixer
================

This script fixes JSON files that contain invalid JavaScript values like
Infinity, -Infinity, and NaN by replacing them with valid JSON values.

Author: AI Assistant for HopHacks 2025
"""

import json
import os
import re
from pathlib import Path

def fix_json_content(content):
    """Fix JSON content by replacing invalid values"""
    # Replace Infinity with null
    content = re.sub(r'\bInfinity\b', 'null', content)
    # Replace -Infinity with null  
    content = re.sub(r'\b-Infinity\b', 'null', content)
    # Replace NaN with null
    content = re.sub(r'\bNaN\b', 'null', content)
    return content

def fix_json_file(file_path):
    """Fix a single JSON file"""
    try:
        # Read the file as text first
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Check if it needs fixing
        if 'Infinity' in content or 'NaN' in content:
            print(f"🔧 Fixing: {file_path.name}")
            
            # Fix the content
            fixed_content = fix_json_content(content)
            
            # Validate that it's now valid JSON
            try:
                json.loads(fixed_content)
                
                # Write the fixed content back
                with open(file_path, 'w') as f:
                    f.write(fixed_content)
                
                print(f"  ✅ Fixed successfully")
                return True
                
            except json.JSONDecodeError as e:
                print(f"  ❌ Still invalid JSON after fix: {e}")
                return False
        else:
            # Already valid
            return True
            
    except Exception as e:
        print(f"  ❌ Error fixing {file_path.name}: {e}")
        return False

def main():
    """Fix all JSON files in the frontend data directory"""
    data_dir = Path("/Users/kacemettahali/Desktop/pacify/frontend/public/data")
    
    print("🚀 JSON File Fixer - Fixing Invalid JSON Files")
    print("=" * 60)
    
    # Find all JSON files
    json_files = list(data_dir.glob("*.json"))
    print(f"📁 Found {len(json_files)} JSON files")
    
    fixed_count = 0
    error_count = 0
    
    for json_file in json_files:
        if fix_json_file(json_file):
            fixed_count += 1
        else:
            error_count += 1
    
    print("\n" + "=" * 60)
    print("📊 SUMMARY:")
    print(f"  ✅ Successfully processed: {fixed_count}")
    print(f"  ❌ Errors: {error_count}")
    print(f"  📈 Total files: {len(json_files)}")
    
    if error_count == 0:
        print("\n🎉 All JSON files are now valid!")
    else:
        print(f"\n⚠️  {error_count} files still have issues")

if __name__ == "__main__":
    main()
