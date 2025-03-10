import os
import json
import datetime
from tree_sitter import Language, Parser
import tree_sitter_cpp as tscpp

# Paths (Update for your setup)
API_FOLDER = "tt_metal/api/"

CPP_LANGUAGE = Language(tscpp.language())
PARSER = Parser(CPP_LANGUAGE)

def get_cpp_files(folder):
    """Recursively find all C++ header files."""
    return [os.path.join(root, file)
            for root, _, files in os.walk(folder)
            for file in files if file.endswith((".h", ".hpp"))]

def parse_cpp_file(file_path):
    """Parse a C++ header file with Tree-sitter and extract metrics."""
    with open(file_path, "r", encoding="utf-8") as f:
        code = f.read()
    
    tree = PARSER.parse(bytes(code, "utf8"))
    root_node = tree.root_node

    num_types = 0
    num_methods = 0

    def visit_node(node, in_class=False):
        """Recursively visit nodes to count types and methods."""
        nonlocal num_types, num_methods

        if node.type in ["class_specifier", "struct_specifier", "enum_specifier"]:
            num_types += 1
            for child in node.children:
                visit_node(child, in_class=True)

        elif node.type == "function_declaration":
            num_methods += 1  # Count free functions

        elif in_class and node.type in ["field_declaration", "function_definition"]:
            num_methods += 1  # Count class members & methods

        for child in node.children:
            visit_node(child, in_class)

    visit_node(root_node)
    
    # Count lines of code
    num_lines = len(code.splitlines())
    
    return num_types, num_methods, num_lines

def collect_metrics(api_folder):
    """Analyze all C++ headers and collect metrics."""
    cpp_files = get_cpp_files(api_folder)
    total_types = 0
    total_methods = 0
    total_lines = 0

    for file in cpp_files:
        types, methods, lines = parse_cpp_file(file)
        total_types += types
        total_methods += methods
        total_lines += lines

    return {
        "date": datetime.datetime.now().strftime("%Y-%m-%d"),
        "num_files": len(cpp_files),
        "num_types": total_types,
        "num_methods": total_methods,
        "num_lines": total_lines
    }

def main():
    metrics = collect_metrics(API_FOLDER)
    output_file = "api_metrics.json"

    try:
        with open(output_file, "r") as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        data = []

    data.append(metrics)

    with open(output_file, "w") as f:
        json.dump(data, f, indent=4)

    print(json.dumps(metrics, indent=4))

if __name__ == "__main__":
    main()