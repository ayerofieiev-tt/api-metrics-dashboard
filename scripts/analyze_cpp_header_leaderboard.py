#!/usr/bin/env python3
"""
analyze_cpp_header_leaderboard.py - Analyzes C++ header files to create leaderboard data

This script processes C++ header files to identify the top 10 files in these categories:
- Having most lines of code
- Having most implementation in .hpp
- Having most methods declared
- Having most types defined

The results are saved as JSON for display in the dashboard.
"""

import os
import json
import sys
import argparse
from tree_sitter import Language, Parser
import time

# This script requires tree-sitter and tree-sitter-cpp
try:
    import tree_sitter_cpp as tscpp
    CPP_LANGUAGE = Language(tscpp.language())
    try:
        PARSER = Parser()
        PARSER.set_language(CPP_LANGUAGE)
    except AttributeError:
        PARSER = Parser(CPP_LANGUAGE)
except ImportError:
    print("Error: tree_sitter_cpp not installed. Please install it with:")
    print("pip install tree-sitter-cpp")
    sys.exit(1)

def get_cpp_files(folder):
    """Recursively find all C++ header files."""
    if not os.path.exists(folder):
        print(f"Error: Folder {folder} does not exist")
        sys.exit(1)
        
    return [os.path.join(root, file)
            for root, _, files in os.walk(folder)
            for file in files if file.endswith((".h", ".hpp"))]

def parse_cpp_file(file_path):
    """Parse a C++ header file with Tree-sitter and extract metrics."""
    with open(file_path, "r", encoding="utf-8", errors='ignore') as f:
        code = f.read()
    
    tree = PARSER.parse(bytes(code, "utf8"))
    root_node = tree.root_node

    num_types = 0
    num_methods = 0
    implementation_lines = 0
    
    # Store regions to highlight
    type_regions = []
    method_regions = []
    implementation_regions = []

    def is_implementation(node):
        """Check if a node represents implementation (function body, etc.)."""
        if node.type in ["compound_statement", "function_definition"]:
            # Store implementation regions
            implementation_regions.append({
                "start": node.start_point[0] + 1,  # 1-indexed line numbers
                "end": node.end_point[0] + 1
            })
            return True
        return False

    def count_implementation_lines(node):
        """Count lines of code in implementation sections."""
        if not node or not hasattr(node, 'start_point') or not hasattr(node, 'end_point'):
            return 0
            
        if is_implementation(node):
            return node.end_point[0] - node.start_point[0] + 1
            
        count = 0
        for child in node.children:
            count += count_implementation_lines(child)
        return count

    def visit_node(node, in_class=False):
        """Recursively visit nodes to count types and methods."""
        nonlocal num_types, num_methods

        if node.type in ["class_specifier", "struct_specifier", "enum_specifier"]:
            num_types += 1
            type_regions.append({
                "start": node.start_point[0] + 1,  # 1-indexed line numbers
                "end": node.end_point[0] + 1,
                "type": node.type.replace("_specifier", "")
            })
            for child in node.children:
                visit_node(child, in_class=True)

        elif node.type == "function_declaration":
            num_methods += 1  # Count free functions
            method_regions.append({
                "start": node.start_point[0] + 1,  # 1-indexed line numbers
                "end": node.end_point[0] + 1,
                "type": "free_function"
            })

        elif in_class and node.type in ["field_declaration", "function_definition"]:
            num_methods += 1  # Count class members & methods
            method_regions.append({
                "start": node.start_point[0] + 1,  # 1-indexed line numbers
                "end": node.end_point[0] + 1,
                "type": "class_method" if node.type == "function_definition" else "field"
            })

        for child in node.children:
            visit_node(child, in_class)

    visit_node(root_node)
    
    # Count lines of code
    num_lines = len(code.splitlines())
    
    # Count implementation lines for hpp files
    if file_path.endswith(".hpp"):
        implementation_lines = count_implementation_lines(root_node)
    
    return {
        "path": os.path.relpath(file_path),
        "filename": os.path.basename(file_path),
        "num_types": num_types,
        "num_methods": num_methods,
        "num_lines": num_lines,
        "implementation_lines": implementation_lines,
        "highlight_regions": {
            "types": type_regions,
            "methods": method_regions,
            "implementations": implementation_regions
        }
    }

def collect_file_metrics(api_folder):
    """Analyze all C++ headers and collect metrics per file."""
    cpp_files = get_cpp_files(api_folder)
    file_metrics = []
    
    total_files = len(cpp_files)
    print(f"Found {total_files} header files to analyze")
    
    for i, file in enumerate(cpp_files):
        if i % 10 == 0:
            print(f"Analyzing file {i+1}/{total_files}: {os.path.basename(file)}")
        try:
            metrics = parse_cpp_file(file)
            file_metrics.append(metrics)
        except Exception as e:
            print(f"Error analyzing {file}: {str(e)}")
    
    return file_metrics

def generate_leaderboards(file_metrics):
    """Generate leaderboards for each category."""
    # Sort by lines of code
    most_loc = sorted(file_metrics, key=lambda x: x["num_lines"], reverse=True)[:10]
    
    # Sort by implementation in hpp
    most_impl = sorted([f for f in file_metrics if f["path"].endswith(".hpp")], 
                      key=lambda x: x["implementation_lines"], reverse=True)[:10]
    
    # Sort by number of methods
    most_methods = sorted(file_metrics, key=lambda x: x["num_methods"], reverse=True)[:10]
    
    # Sort by number of types
    most_types = sorted(file_metrics, key=lambda x: x["num_types"], reverse=True)[:10]
    
    return {
        "most_lines_of_code": most_loc,
        "most_implementation_lines": most_impl,
        "most_methods": most_methods,
        "most_types": most_types,
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_files_analyzed": len(file_metrics)
    }

def main():
    parser = argparse.ArgumentParser(description='Analyze C++ headers to create leaderboard data')
    parser.add_argument('api_folder', help='Path to the API folder to analyze')
    parser.add_argument('output_file', help='Path to the output JSON file')
    
    args = parser.parse_args()
    
    print(f"Starting analysis of {args.api_folder}")
    start_time = time.time()
    
    file_metrics = collect_file_metrics(args.api_folder)
    
    print(f"\nAnalysis completed in {time.time() - start_time:.2f} seconds")
    print(f"Analyzed {len(file_metrics)} files")
    
    # Generate and save leaderboards
    leaderboards = generate_leaderboards(file_metrics)
    
    with open(args.output_file, "w") as f:
        json.dump(leaderboards, f, indent=2)
    
    print(f"Leaderboard data saved to {args.output_file}")

if __name__ == "__main__":
    main() 