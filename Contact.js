import fs from "fs";
import XLSX from "xlsx";
import readlineSync from "readline-sync";

export default class Contact {
  constructor(filePath) {
    this.filePath = filePath;
    this.finVCard = "";
    this.records = [];
    this.headers = [];
    this.cols = {};

    try {
      const extension = this.filePath.split('.').pop().toLowerCase();
      let workbook;

      // Handle different file formats
      if (extension === "csv") {
        // Read CSV as UTF-8 string
        const content = fs.readFileSync(this.filePath, "utf8");
        workbook = XLSX.read(content, { type: "string" });
      } else if (["xls", "xlsx", "ods"].includes(extension)) {
        // Read binary files directly
        workbook = XLSX.readFile(this.filePath);
      } else {
        throw new Error(`Unsupported file format: .${extension}`);
      }

      // Process worksheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      this.records = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      
      if (this.records.length === 0) {
        throw new Error("No records found in file.");
      }
      
      this.headers = Object.keys(this.records[0]);
      
    } catch (error) {
      throw new Error(`Error reading file: ${error.message}`);
    }
  }


  showTable() {
    console.log("First 5 rows:");
    console.table(this.records.slice(0, 5));
    console.log("\nAvailable columns:");
    console.table(this.headers.map((h, i) => ({ index: i, column: h })));
  }

  escapeValue(value) {
    return String(value ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  }

  foldLine(line) {
    // RFC2426-compliant folding (max 75 bytes per line)
    const maxLen = 75;
    if (Buffer.byteLength(line, "utf8") <= maxLen) return line;
    
    let folded = "";
    let current = "";
    for (const char of line) {
      if (Buffer.byteLength(current + char, "utf8") > maxLen) {
        folded += current + "\r\n ";
        current = char;
      } else {
        current += char;
      }
    }
    return folded + current;
  }

  addContact(data) {
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${this.escapeValue(data.last_name)};${this.escapeValue(data.first_name)};` +
      `${this.escapeValue(data.additional_names || "")};` +
      `${this.escapeValue(data.prefix || "")};${this.escapeValue(data.suffix || "")}`,
      `FN:${this.escapeValue(data.formatted_name)}`
    ];

    // Phone handling
    for (const ph of data.phone || []) {
      if (ph.phn) {
        lines.push(`TEL;TYPE=${ph.typ},VOICE:${this.escapeValue(ph.phn)}`);
      }
    }

    // Add missing address field
    if (data.address) {
      lines.push(`ADR;TYPE=HOME:;;${this.escapeValue(data.address)};;;;`);
    }

    // Other fields
    if (data.email) lines.push(`EMAIL;TYPE=INTERNET:${this.escapeValue(data.email)}`);
    if (data.org) lines.push(`ORG:${this.escapeValue(data.org)}`);
    if (data.title) lines.push(`TITLE:${this.escapeValue(data.title)}`);
    if (data.url) lines.push(`URL:${this.escapeValue(data.url)}`);
    lines.push("END:VCARD"); // Removed \n

    return lines.map(l => this.foldLine(l)).join("\r\n") + "\r\n\r\n";
  }


  selectCol() {
    console.log("\n=== Column Selection ===");
    console.log(`Found ${this.headers.length} columns. Enter indices (0-${this.headers.length - 1})`);

    const askCol = (label, optional = false) => {
      const response = readlineSync.question(
        `➤ ${label} column index${optional ? " (ENTER to skip)" : ")"}: `
      ).trim();

      if (optional && !response) return null;
      
      const index = parseInt(response);
      if (isNaN(index) || index < 0 || index >= this.headers.length) {
        throw new Error(`Invalid index for ${label}. Use 0-${this.headers.length - 1}`);
      }
      return this.headers[index];
    };

    const askMultiCol = (label) => {
      const response = readlineSync.question(
        `➤ ${label} column indices (comma-separated): `
      ).trim();

      return response.split(",").map(item => {
        const index = parseInt(item.trim());
        if (isNaN(index) || index < 0 || index >= this.headers.length) {
          throw new Error(`Invalid index in ${label}. Use 0-${this.headers.length - 1}`);
        }
        return this.headers[index];
      });
    };

    const askPhoneTypes = (count) => {
      const validTypes = ["CELL", "WORK", "HOME", "VOICE"];
      const response = readlineSync.question(
        `➤ Enter ${count} phone types (comma-separated, CELL/WORK/HOME/VOICE): `
      ).trim().toUpperCase();

      const types = response ? response.split(",").map(t => t.trim()) : [];
      
      // Fill missing types with CELL
      while (types.length < count) types.push("CELL");
      
      return types.map(t => validTypes.includes(t) ? t : "CELL");
    };

    try {
      this.cols = {
        first_name: askCol("First name"),
        last_name: askCol("Last name", true),
        formatted_name: askCol("Formatted name", true),
        additional_names: askCol("Additional names", true),
        prefix: askCol("Prefix", true),
        suffix: askCol("Suffix", true),
        phone: {
          columns: askMultiCol("Phone numbers"),
          types: [] // Will populate below
        },
        email: askCol("Email", true),
        address: askCol("Address", true),
        org: askCol("Organization", true),
        title: askCol("Title", true),
        url: askCol("URL", true)
      };

      // Get phone types after we know how many columns
      this.cols.phone.types = askPhoneTypes(this.cols.phone.columns.length);

    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      console.log("Please restart column selection\n");
      return this.selectCol();
    }

    // Generate vCards
    for (const row of this.records) {
      const data = {
        first_name: row[this.cols.first_name] || "",
        last_name: this.cols.last_name ? row[this.cols.last_name] : "",
        formatted_name: this.cols.formatted_name 
          ? row[this.cols.formatted_name] 
          : `${row[this.cols.first_name] || ''} ${row[this.cols.last_name] || ''}`.trim(),
        additional_names: this.cols.additional_names ? row[this.cols.additional_names] : "",
        prefix: this.cols.prefix ? row[this.cols.prefix] : "",
        suffix: this.cols.suffix ? row[this.cols.suffix] : "",
        phone: this.cols.phone.columns.map((col, i) => ({
          phn: row[col],
          typ: this.cols.phone.types[i]
        })).filter(ph => ph.phn), // Filter empty numbers
        email: this.cols.email ? row[this.cols.email] : "",
        address: this.cols.address ? row[this.cols.address] : "",
        org: this.cols.org ? row[this.cols.org] : "",
        title: this.cols.title ? row[this.cols.title] : "",
        url: this.cols.url ? row[this.cols.url] : ""
      };

      this.finVCard += this.addContact(data);
    }

    console.log(`\n✅ Generated ${this.records.length} contacts`);
  }

  createVCard(outputPath = "./contacts.vcf") {
    fs.writeFileSync(outputPath, this.finVCard, "utf-8");
    console.log(`\n💾 Saved ${this.records.length} contacts to ${outputPath}`);
  }
}