/* =========================================
   THUNDERCLASH 2026 - BACKEND SERVER
   (Features: Cloudinary, Reg Bot, Contact Bot, Wake-up)
   ========================================= */

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==================================================
// 🤖 BOT SETUP
// ==================================================

// 1. REGISTRATION BOT
if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.error("❌ CRITICAL: Registration Bot Vars Missing!");
}
const regBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// 2. CONTACT SUPPORT BOT
const contactToken = process.env.CONTACT_BOT_TOKEN;
const contactChatId = process.env.CONTACT_CHAT_ID;
let contactBot = null;

if (contactToken && contactChatId) {
    contactBot = new TelegramBot(contactToken, { polling: false });
    console.log("✅ Contact Support Bot Initialized");
} else {
    console.warn("⚠️ Contact Bot Vars missing. Contact form will not work.");
}


// ==================================================
// ☁️ CLOUDINARY CONFIG
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

// 1. WAKE UP ROUTE
app.get('/wakeup', (req, res) => {
    console.log("☀️ Wake-up ping received!");
    res.send("Server is awake and ready!");
});


// 2. CONTACT FORM ROUTE (Updated for Phone Number)
app.post('/contact', async (req, res) => {
    try {
        console.log("📩 New Support Message Received");
        // CHANGED: receiving 'phone' instead of 'email'
        const { name, phone, uid, message } = req.body;

        if (!contactBot) {
            return res.status(500).json({ success: false, message: 'Support bot not configured.' });
        }

        const telegramMsg = `
📬 *NEW SUPPORT TICKET*

👤 *User:* ${name}
📞 *Phone:* \`${phone}\`
🎮 *UID:* \`${uid}\`

📝 *Message:*
${message}
`;

        await contactBot.sendMessage(contactChatId, telegramMsg, { parse_mode: 'Markdown' });
        res.json({ success: true, message: 'Message sent successfully!' });

    } catch (error) {
        console.error("❌ Contact Error:", error);
        res.status(500).json({ success: false, message: 'Failed to send message.' });
    }
});


// 3. REGISTRATION ROUTE
app.post('/register', upload.single('screenshot'), async (req, res) => {
    try {
        console.log("------------------------------------------------");
        console.log("📥 NEW REGISTRATION:", req.body.playerName);

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Payment screenshot is required' });
        }

        const {
            registrationType,
            playerName,
            freeFireUID,
            email,
            phone,
            paymentMethod,
            teammate1UID,
            teammate2UID,
            teammate3UID
        } = req.body;

        const imageUrl = req.file.path;
        let message = '';

        if (registrationType === 'SQUAD') {
            message = `
🚨 *NEW SQUAD REGISTRATION* 🚨

👥 *LEADER INFO*
👤 Name: *${playerName}*
📧 Email: ${email}
📞 Phone: \`${phone}\`

⚔️ *ROSTER (4 Players)*
1. \`${freeFireUID}\` (L)
2. \`${teammate1UID}\`
3. \`${teammate2UID}\`
4. \`${teammate3UID}\`

💸 *PAYMENT*
Method: ${paymentMethod}
`;
        } else {
            message = `
👤 *NEW SOLO REGISTRATION*

🕴️ *PLAYER INFO*
👤 Name: *${playerName}*
🎮 UID: \`${freeFireUID}\`
📧 Email: ${email}
📞 Phone: \`${phone}\`

💸 *PAYMENT*
Method: ${paymentMethod}
`;
        }

        await regBot.sendPhoto(process.env.TELEGRAM_CHAT_ID, imageUrl, {
            caption: message,
            parse_mode: 'Markdown'
        });

        console.log("✅ Registration Sent to Telegram");

        res.json({ 
            success: true, 
            message: 'Registration successful!',
            imageUrl: imageUrl 
        });

    } catch (error) {
        console.error('❌ SERVER ERROR:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.listen(PORT, () => {
    console.log(`⚡ Server running on http://localhost:${PORT}`);
});