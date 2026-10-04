// Run once: npm run seed:admin
// Creates the single admin account using ADMIN_USERNAME / ADMIN_PASSWORD from .env
// If an admin already exists, it will NOT create another one (only one admin allowed).
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("./models/Admin");
const dns = require("dns")


dns.setServers(['8.8.8.8','1.1.1.1'])

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const existingCount = await Admin.countDocuments();
  if (existingCount > 0) {
    console.log("An admin already exists. Only one admin is allowed. Aborting.");
    process.exit(0);
  }

  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "Admin@12345";
  const hashed = await bcrypt.hash(password, 10);

  await Admin.create({ username, password: hashed });
  console.log(`Admin created successfully. Username: ${username}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
