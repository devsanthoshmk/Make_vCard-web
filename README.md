# Make_vCard-web: vCard generator web and digital business card creator

Make_vCard-web is a client-side web application and Node.js command-line tool that converts spreadsheet contacts into RFC 2426 vCard 3.0 files.

The project works as a vCard generator web application and digital business card creator for bulk address book conversions. It converts rows from Excel, ODS, and CSV spreadsheets into VCF files ready for mobile phones, email clients, or conversion into a QR contact card.

## Architecture

The repository contains two converter implementations and a Python test suite:

- Browser interface in `index.html`: Runs in the client browser without a backend server. It loads SheetJS version 0.20.0 to parse uploaded spreadsheet files into array buffers, renders an HTML table preview of the first 5 records, maps columns through dropdown selects, and generates `.vcf` files using client-side Blob creation.
- Command-line tool in `Contact.js` and `index.js`: Runs on Node.js using ES modules. It reads spreadsheets with the `xlsx` package, collects column indexes through interactive prompts with `readline-sync`, formats contact records into vCard 3.0 text, folds lines longer than 75 bytes, and writes the output file to disk with `fs.writeFileSync`.
- Test harness in `test/test_write.py` and `test/test_read.py`: Python scripts that use Tablib to generate sample datasets in CSV, HTML, ODS, XLS, XLSX, and YAML formats, then verify that row data matches expected name and phone values.

Data flow follows three sequential phases:

1. Ingestion: The parser reads spreadsheet binary or text data and converts rows into JavaScript object arrays.
2. Field mapping: The user associates spreadsheet column headers with vCard properties, including first name, last name, full name, phone numbers, email, physical address, organization, job title, website URL, and birthday.
3. Serialization: The generator escapes delimiter characters including backslashes, semicolons, and commas, folds lines at 75 bytes, prepends a UTF-8 byte order mark, and outputs the final `.vcf` document.

## Setup

### Prerequisites

- Node.js 18 or higher for the command-line tool
- Python 3.8 or higher with Tablib for running test data generators
- A modern web browser such as Chrome, Firefox, Safari, or Edge for the web interface

### Web interface setup

The browser interface requires no package installation or build step:

1. Clone the repository:
   ```bash
   git clone https://github.com/devsanthoshmk/Make_vCard-web.git
   cd Make_vCard-web
   ```
2. Open `index.html` directly in any web browser:
   ```bash
   open index.html
   ```

### Command-line tool setup

1. Install project dependencies:
   ```bash
   npm install
   ```

### Python test harness setup

1. Install Tablib:
   ```bash
   pip install tablib
   ```

## Usage

### Web interface workflow

1. Open `index.html` in your web browser.
2. Drag and drop a spreadsheet with xlsx, xls, csv, or ods extensions into the drop area, or click to choose a file.
3. Review the 5-row table preview and map your columns to the corresponding contact fields. First Name and Phone are required fields.
4. Click Generate vCard to review the plain-text preview.
5. Click Download vCard File to save the generated `.vcf` file to your computer.

### Command-line tool workflow

1. Edit the input path in `index.js` to point to your spreadsheet file:
   ```javascript
   import Contact from "./Contact.js";

   const contact = new Contact("./test/table_data/table.ods");
   contact.showTable();
   contact.selectCol();
   contact.createVCard("./output/contacts.vcf");
   ```
2. Run the script:
   ```bash
   node index.js
   ```
3. Enter column indexes when prompted by the terminal. The script displays the first 5 rows and a numbered index list for each column header.
4. Collect the generated `.vcf` file from the specified output directory.

### Running test scripts

Generate test datasets across all supported formats:

```bash
python test/test_write.py
```

Verify that Tablib can read back the generated contact tables:

```bash
python test/test_read.py
```

## Configuration

### Field mappings

The converter maps spreadsheet headers to the following vCard 3.0 properties:

| vCard property | Web interface field | CLI prompt | Format requirements |
|---|---|---|---|
| `N` and `FN` | First Name | First name | Required text string |
| `N` | Last Name | Last name | Optional text string |
| `FN` | Full Name | Formatted name | Optional combined display name |
| `TEL` | Phone | Phone numbers | Normalized phone number with leading `+` |
| `TEL` | Extra phones | Phone numbers | Phone types: `CELL`, `WORK`, `HOME`, `OTHER` |
| `EMAIL` | Email | Email | Internet email address |
| `ADR` | Address | Address | Formatted street address string |
| `ORG` | Organization | Organization | Company or organization name |
| `TITLE` | Title | Title | Job title |
| `URL` | URL | URL | Web address |
| `BDAY` | Birthday | Not in CLI | Date string formatted to `YYYYMMDD` |

### vCard formatting specifications

The output adheres to the RFC 2426 standard:

- Version header: `VERSION:3.0`
- Character encoding: UTF-8 with byte order mark prefix
- Value escaping: Escapes backslashes, semicolons, commas, and line breaks
- Line folding: Folds lines longer than 75 bytes using standard continuation sequences
- Telephone normalization: Converts leading `00` country code prefixes into standard `+` signs
