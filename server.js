const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const xlsx = require("xlsx");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

const app = express();
app.use(express.json());

/**
 * ========== MOCK EXISTING USER REGISTRATION API ==========
 * Endpoint: POST /api/registerUser
 * Accepts: { name, email?, phone? }
 * Returns: { userId, name, email?, phone? }
 */
const usersDb = [];

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^\+?\d{7,15}$/.test(phone);
}

app.post("/api/registerUser", (req, res) => {
  const { name, email, phone } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  if (!email && !phone) {
    return res
      .status(400)
      .json({ error: "At least email or phone is required" });
  }

  if (email && !isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (phone && !isValidPhone(phone)) {
    return res.status(400).json({ error: "Invalid phone format" });
  }

  const userId = uuidv4();
  const user = { userId, name };
  if (email) user.email = email;
  if (phone) user.phone = phone;

  usersDb.push(user);
  return res.json(user);
});

/**
 * ========== BULK REGISTRATION API ==========
 * Endpoint: POST /register-bulk
 * Accepts: JSON { "fileUrl": "https://..." }
 * Downloads Excel, parses users, calls /api/registerUser for each
 */

app.post("/register-bulk", async (req, res) => {
  const fileName = req.body.fileName || "DEMO.xlsx";
  const filePath = path.join(__dirname, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(400).json({ error: `File not found: ${fileName}` });
  }

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/[-:]/g, "") // remove - and :
      .replace(/\..+/, ""); // remove milliseconds part after dot

    const randomStr = crypto.randomBytes(2).toString("hex");

    const outputFileName = `registered_users_${timestamp}_${randomStr}.xlsx`;

    const registeredUsers = [];

    for (const row of data) {
      const name = row["Name"];
      const email = row["Email"];
      const phone = row["Phone"];

      if (!name) continue;

      const hasValidEmail = email && isValidEmail(email);
      const hasValidPhone = phone && isValidPhone(phone);

      if (!hasValidEmail && !hasValidPhone) continue;

      const payload = { name };
      if (hasValidEmail) payload.email = email;
      if (hasValidPhone) payload.phone = phone;

      try {
        const apiRes = await axios.post(
          "http://localhost:3000/api/registerUser",
          payload
        );
        registeredUsers.push(apiRes.data);
      } catch (err) {
        console.error(`Failed to register ${name}: ${err.message}`);
      }
    }

    // ✅ Prepare Excel data
    const exportData = registeredUsers.map((user) => ({
      name: user.name,
      userId: user.userId,
      email: user.email || "",
      phone: user.phone ? `${user.phone}` : "",
    }));

    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const newWorkbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(newWorkbook, worksheet, "RegisteredUsers");

    // const outputFilePath = path.join(__dirname, "registered_users.xlsx");
    const outputFilePath = path.join(__dirname, outputFileName);
    xlsx.writeFile(newWorkbook, outputFilePath);

    // ✅ Final JSON response
    return res.json({
      message: "Bulk registration from local file completed",
      registeredCount: registeredUsers.length,
      savedToFile: outputFileName,
      registeredUsers,
    });
  } catch (err) {
    console.error("Bulk registration error:", err);
    return res.status(500).json({
      error: "Failed to process Excel file",
      details: err.message,
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`→ POST /api/registerUser (individual user registration)`);
  console.log(`→ POST /register-bulk (bulk via Excel file URL)`);
});
