import tablib
import os

folder_path = "./table_data/"

for filename in os.listdir(folder_path):
    file_path = os.path.join(folder_path, filename)
    if not os.path.isfile(file_path):
        continue

    # Read the file’s contents (text or binary mode as appropriate)
    # CSV/TSV/JSON/etc → text mode; XLS/XLSX → binary mode
    mode = "rb" if filename.lower().endswith((".xls", ".xlsx", ".ods")) else "r"
    print(mode, filename, "/n")
    with open(file_path, mode) as f:
        content = f.read()

    # Now let Tablib auto-detect:
    try:
        data = tablib.Dataset().load(content)
    except tablib.exceptions.UnsupportedFormat:
        print(f"Skipping {filename}: unsupported or unrecognized format")
        continue

    # Use .dict (or .dicts in older versions) for row-dicts
    for row in data.dict:
        print(row["Name"], row["Phone"])
