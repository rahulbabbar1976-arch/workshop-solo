import Database from 'better-sqlite3';

const dbPath = 'C:/Users/rahul/OneDrive/Desktop/workshop/dev.db';
const db = new Database(dbPath, { readonly: true });

console.log("Customer:", db.prepare("SELECT * FROM Customer LIMIT 1").get());
console.log("Vehicle:", db.prepare("SELECT * FROM Vehicle LIMIT 1").get());
console.log("LabourMaster:", db.prepare("SELECT * FROM LabourMaster LIMIT 1").get());
console.log("PartsMaster:", db.prepare("SELECT * FROM PartsMaster LIMIT 1").get());
console.log("JobCard:", db.prepare("SELECT * FROM JobCard LIMIT 1").get());
console.log("ReminderEvent:", db.prepare("SELECT * FROM ReminderEvent LIMIT 1").get());
