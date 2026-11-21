const nodemailer = require("nodemailer");
const { execSync } = require("child_process");

// 🔐 SMTP CONFIG
const EMAIL_USER = "rajudkm01@gmail.com";
const EMAIL_PASS = "vqgn dosg zssv vcxr";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// 👇 Recipients
const recipients = [
  { email: "rajukumar957259@gmail.com", name: "Raju" },
  { email: "ambika.ambika1210@gmail.com", name: "Ambika" }
];

// CLI args
const [commitId, commitMsg, author] = process.argv.slice(2);

// 🧠 PM2 status → structured rows
let pm2Rows = [];
try {
  const raw = execSync("COLUMNS=200 /usr/bin/pm2 status --no-color", {
    encoding: "utf-8",
    maxBuffer: 1024 * 1024,
  });

  const lines = raw.split("\n").filter(l => l.trim().startsWith("│"));

  pm2Rows = lines.map(line =>
    line.split("│")
      .slice(1, -1)
      .map(cell => cell.trim())
  );

} catch (err) {
  pm2Rows = [["Error"], ["Failed to fetch PM2 status"]];
}

// 🔧 Build HTML table
const buildPm2Table = (rows) => {
  if (!rows.length) return "<p>No PM2 data</p>";

  const [header, ...body] = rows;

  const thCells = header.map(h =>
    `<th style="padding:8px; border:1px solid #334155;">${h}</th>`
  ).join("");

  const trRows = body.map(row => {
    const tds = row.map((cell, i) => {
      let style = "padding:8px; border:1px solid #334155;";

      if (header[i]?.toLowerCase() === "status") {
        style += cell === "online"
          ? " color:#22c55e; font-weight:bold;"
          : " color:#ef4444; font-weight:bold;";
      }

      return `<td style="${style}">${cell}</td>`;
    }).join("");

    return `<tr>${tds}</tr>`;
  }).join("");

  return `
    <div style="overflow-x:auto;">
      <table style="
        border-collapse: collapse;
        width: 100%;
        font-size: 12px;
        font-family: monospace;
        background: #0f172a;
        color: #e5e7eb;
        border-radius: 6px;
      ">
        <thead>
          <tr style="background:#1e293b;">
            ${thCells}
          </tr>
        </thead>
        <tbody>
          ${trRows}
        </tbody>
      </table>
    </div>
  `;
};

// 🕒 IST Time
const timeIST = new Date().toLocaleString("en-IN", {
  timeZone: "Asia/Kolkata",
  dateStyle: "medium",
  timeStyle: "medium",
});

// 📧 Send mail
const sendMail = async (user) => {
  const { email, name } = user;

  const mailOptions = {
    from: `Adshamper Deploy Bot <${EMAIL_USER}>`,
    to: `${name} <${email}>`,
    subject: "🚀 Deployment Successful - Adshamper API",
    html: `
    <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px;">
      
      <div style="max-width:800px; margin:auto; background:white; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background:#4f46e5; color:white; padding:20px;">
          <h2 style="margin:0;">🚀 Deployment Successful</h2>
          <p style="margin:5px 0 0;">Adshamper API deployed on EC2</p>
        </div>

        <!-- Body -->
        <div style="padding:20px; color:#333;">
          
          <p>Hi ${name},</p>

          <p>Your latest deployment has been completed successfully ✅</p>

          <h3>📌 Commit Details</h3>
          <p><b>Commit ID:</b> ${commitId}</p>
          <p><b>Author:</b> ${author}</p>
          <p><b>Message:</b> ${commitMsg}</p>

          <hr style="margin:20px 0;" />

          <h3>⚙️ PM2 Status</h3>
          ${buildPm2Table(pm2Rows)}

          <hr style="margin:20px 0;" />

          <p><b>🖥 Server:</b> AWS EC2</p>
          <p><b>⏰ Time:</b> ${timeIST} (IST)</p>

          <br/>
          <p>Regards,<br/>Adshamper DevOps Bot</p>

        </div>

        <!-- Footer -->
        <div style="background:#f1f5f9; padding:10px; text-align:center; font-size:12px; color:#555;">
          Automated Deployment Notification
        </div>

      </div>
    </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${email}`);
  } catch (err) {
    console.error(`❌ Failed for ${email}:`, err.message);
  }
};

// 🔁 Send sequentially
(async () => {
  for (const user of recipients) {
    await sendMail(user);
  }
})();
