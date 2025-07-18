import Contact from './Contact.js';

// Process contacts
const contact = new Contact("./test/table_data/table.ods");
contact.showTable();
contact.selectCol();
contact.createVCard("./output/contacts.vcf");