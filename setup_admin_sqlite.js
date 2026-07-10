const Database = require('better-sqlite3');
const db = new Database('./dev.db');

console.log('Deleting all users except rahulbabbar@babbarsons.com...');
db.prepare("DELETE FROM User WHERE email != 'rahulbabbar@babbarsons.com'").run();

const existing = db.prepare("SELECT * FROM User WHERE email = 'rahulbabbar@babbarsons.com'").get();

if (existing) {
  console.log('Updating existing admin...');
  db.prepare("UPDATE User SET pin = '1002', role = 'super_admin', name = 'Rahul Babbar' WHERE email = 'rahulbabbar@babbarsons.com'").run();
} else {
  console.log('Creating new admin...');
  db.prepare(`
    INSERT INTO User (id, email, pin, role, name, createdAt, updatedAt) 
    VALUES ('admin_1', 'rahulbabbar@babbarsons.com', '1002', 'super_admin', 'Rahul Babbar', datetime('now'), datetime('now'))
  `).run();
}

console.log('Done.');
db.close();
