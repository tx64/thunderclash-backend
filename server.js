/* =========================================
   THUNDERCLASH 2026 - BACKEND SERVER
   (Includes Wake-up Route for Fast Submissions)
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

// --- TELEGRAM CONFIG ---
if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.error("❌ CRITICAL: Telegram Env Variables Missing!");
    process.exit(1);
}
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// --- CLOUDINARY CONFIG ---
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


// --- 🚀 NEW WAKE-UP ROUTE ---
// The frontend calls this silently when the form opens.
app.get('/wakeup', (req, res) => {
    console.log("☀️ Wake-up ping received! Server is warming up...");
    res.send("Server is awake and ready!");
});


// --- MAIN REGISTER ROUTE ---
app.post('/register', upload.single('screenshot'), async (req, res) => {
    try {
        console.log("------------------------------------------------");
        console.log("📥 NEW REQUEST:", req.body.playerName);

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

        // --- PREPARE MESSAGE ---
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

        // --- SEND PHOTO WITH CAPTION ---
        await bot.sendPhoto(process.env.TELEGRAM_CHAT_ID, imageUrl, {
            caption: message,
            parse_mode: 'Markdown'
        });

        console.log("✅ Sent to Telegram as Single Message");

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