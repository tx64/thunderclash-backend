/* =========================================
   THUNDERCLASH 2026 - BACKEND SERVER
   (Telegram + Cloudinary + Google Sheets Dual Tabs)
   ========================================= */

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const TelegramBot = require('node-telegram-bot-api');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==================================================
// 🤖 1. TELEGRAM BOTS
// ==================================================
if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.error("❌ CRITICAL: Registration Bot Vars Missing!");
}
const regBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const contactToken = process.env.CONTACT_BOT_TOKEN;
const contactChatId = process.env.CONTACT_CHAT_ID;
let contactBot = null;

if (contactToken && contactChatId) {
    contactBot = new TelegramBot(contactToken, { polling: false });
    console.log("✅ Contact Bot Ready");
}

// ==================================================
// 📊 2. GOOGLE SHEETS SETUP
// ==================================================
const googleAuth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        // Fix for Render environment variable newline issues
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth: googleAuth });

// Function to write to specific Sheet Tab
async function writeToSheet(tabName, rowData) {
    try {
        if (!process.env.GOOGLE_SHEET_ID) return;

        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: `${tabName}!A:Z`, // e.g., 'Solo!A:Z' or 'Squad!A:Z'
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [rowData],
            },
        });
        console.log(`✅ Data added to ${tabName} Sheet`);
    } catch (error) {
        console.error(`❌ Sheet Error (${tabName}):`, error.message);
    }
}

// ==================================================
// ☁️ 3. CLOUDINARY CONFIG
// ==================================================
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'thunderclash_payments',
        allowed_formats: ['jpg', 'png', 'jpeg', 'heic'],
    },
});
const upload = multer({ storage: storage });


// ==================================================
// 🚀 ROUTES
// ==================================================

// 1. WAKE UP
app.get('/wakeup', (req, res) => {
    console.log("☀️ Wake-up ping!");
    res.send("Server is awake!");
});

// 2. CONTACT FORM (Sends to Telegram only)
app.post('/contact', async (req, res) => {
    try {
        const { name, phone, uid, message } = req.body;

        if (contactBot) {
            const msg = `📬 *SUPPORT TICKET*\n\n👤 ${name}\n📞 \`${phone}\`\n🎮 \`${uid}\`\n\n📝 ${message}`;
            await contactBot.sendMessage(contactChatId, msg, { parse_mode: 'Markdown' });
        }
        
        res.json({ success: true, message: 'Sent!' });
    } catch (error) {
        console.error("Contact Error:", error);
        res.status(500).json({ success: false });
    }
});

// 3. REGISTRATION (Telegram + Sheets)
app.post('/register', upload.single('screenshot'), async (req, res) => {
    try {
        console.log("📥 NEW REGISTRATION:", req.body.playerName);

        if (!req.file) return res.status(400).json({ success: false, message: 'Screenshot missing' });

        const {
            registrationType, playerName, freeFireUID, email, phone, 
            paymentMethod, teammate1UID, teammate2UID, teammate3UID
        } = req.body;

        const imageUrl = req.file.path;
        const date = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

        // --- LOGIC FOR SOLO VS SQUAD ---
        if (registrationType === 'SQUAD') {
            // 1. Send to Telegram
            const msg = `🚨 *SQUAD REGISTRATION*\n\n👤 Leader: ${playerName}\n📞 \`${phone}\`\n📧 ${email}\n\n⚔️ Roster:\n1. ${freeFireUID} (L)\n2. ${teammate1UID}\n3. ${teammate2UID}\n4. ${teammate3UID}\n\n💸 ${paymentMethod}`;
            await regBot.sendPhoto(process.env.TELEGRAM_CHAT_ID, imageUrl, { caption: msg, parse_mode: 'Markdown' });

            // 2. Send to Google Sheets (Tab: Squad)
            // Columns: Date, Leader Name, Phone, Email, Leader UID, Mate 1, Mate 2, Mate 3, Payment Method, Image Proof
            await writeToSheet('Squad', [
                date, 
                playerName, 
                "'"+phone, // Force string for phone
                email, 
                freeFireUID, 
                teammate1UID, 
                teammate2UID, 
                teammate3UID, 
                paymentMethod, 
                imageUrl
            ]);

        } else {
            // 1. Send to Telegram
            const msg = `👤 *SOLO REGISTRATION*\n\n👤 Name: ${playerName}\n🎮 UID: \`${freeFireUID}\`\n📞 \`${phone}\`\n📧 ${email}\n\n💸 ${paymentMethod}`;
            await regBot.sendPhoto(process.env.TELEGRAM_CHAT_ID, imageUrl, { caption: msg, parse_mode: 'Markdown' });

            // 2. Send to Google Sheets (Tab: Solo)
            // Columns: Date, Name, Phone, Email, UID, Payment Method, Image Proof
            await writeToSheet('Solo', [
                date, 
                playerName, 
                "'"+phone, 
                email, 
                freeFireUID, 
                paymentMethod, 
                imageUrl
            ]);
        }

        res.json({ success: true, message: 'Registered successfully!', imageUrl: imageUrl });

    } catch (error) {
        console.error('❌ REGISTRATION ERROR:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.listen(PORT, () => {
    console.log(`⚡ Server running on http://localhost:${PORT}`);
});