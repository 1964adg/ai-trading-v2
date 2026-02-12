import os

exclude = {"node_modules", ".git", "__pycache__", "dist", "build", "venv", "env", ".idea", ".vscode"}
def list_dir(base, depth=2):
    for dirpath, dirnames, filenames in os.walk(base):
        rel_path = os.path.relpath(dirpath, base)
        if rel_path == ".":
            rel_path = ""
        # Esclusione
        if any(ex in rel_path.split(os.sep) for ex in exclude):
            continue
        # Profondità
        current_depth = rel_path.count(os.sep) + 1
        if current_depth > depth:
            continue
        print(rel_path + "/")
        for fname in filenames:
            print(f"  {fname}")

list_dir(".", depth=2)