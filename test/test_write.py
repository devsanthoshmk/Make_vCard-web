import os
import tablib

# 1. Prepare output folder
OUT = "table_data"
os.makedirs(OUT, exist_ok=True)

# 2. Define headers + rows
headers = ["Name", "Age", "City", "Phone"]
rows = [
    ["Alice", 24, "New York", "+1-212-555-0187"],
    ["Bob", 30, "Los Angeles", "+1-310-555-0143"],
    ["Charlie", 22, "Chicago", "+1-312-555-0198"],
    ["David", 35, "Houston", "+1-713-555-0123"],
    ["Eva", 28, "Phoenix", "+1-602-555-0179"],
]

# 3. Build the Tablib Dataset
data = tablib.Dataset()
data.headers = headers
for row in rows:
    data.append(row)

# 4. Export to each format, including CSV
export_map = {
    "csv": "table.csv",
    "html": "table.html",
    "ods": "table.ods",
    "xls": "table.xls",
    "xlsx": "table.xlsx",
    "yaml": "table.yaml",
}

for fmt, fname in export_map.items():
    out_path = os.path.join(OUT, fname)
    content = data.export(fmt)
    # CSV, HTML, YAML produce str; others produce bytes
    mode = "wb" if isinstance(content, (bytes, bytearray)) else "w"
    with open(out_path, mode) as f:
        f.write(content if mode == "w" else content)

# 5. (Optional) print the HTML table to console
print(data.export("html"))
