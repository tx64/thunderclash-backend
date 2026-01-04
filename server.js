/* =========================================
   THUNDERCLASH 2026 - BACKEND SERVER
   (Final Version: Handles Solo vs. Squad Telegram Messages)
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

// --- MIDDLEWARE ---
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
        allowed_formats: ['jpg', 'png', 'jpeg', 'heic'], // Supports iPhone format
    },
});
const upload = multer({ storage: storage });


// --- MAIN REGISTER ROUTE ---
app.post('/register', upload.single('screenshot'), async (req, res) => {
    try {
        // 1. Validation: File Check
        if (!req.file) {
            console.warn("⚠️ Registration attempt without screenshot.");
            return res.status(400).json({ success: false, message: 'Payment screenshot is required' });
        }

        // 2. Extract Data from Frontend
        const {
            registrationType, // 'SOLO' or 'SQUAD'
            playerName,
            freeFireUID,      // This is Player UID (Solo) or Leader UID (Squad)
            email,
            phone,
            paymentMethod,
            teammate1UID,     // Squad only
            teammate2UID,     // Squad only
            teammate3UID      // Squad only
        } = req.body;

        const imageUrl = req.file.path;
        let message = '';

        console.log(`📥 Received: ${registrationType} from ${playerName}`);

        // 3. Build Telegram Message based on Type
        if (registrationType === 'SQUAD') {
            // --- SQUAD TEMPLATE (Full Details) ---
            message = `
🚀 *NEW SQUAD REGISTRATION RECEIVED*

👥 *TEAM LEADER*
👤 *Name:* ${playerName}
📧 *Email:* ${email}
📞 *Phone:* ${phone}

⚔️ *SQUAD UIDs (4 Players)*
1. \`${freeFireUID}\` (Leader)
2. \`${teammate1UID}\`
3. \`${teammate2UID}\`
4. \`${teammate3UID}\`

💸 *PAYMENT INFO*
Method: ${paymentMethod}
Status: *Review Screenshot Below*
`;
        } else {
            // --- SOLO TEMPLATE (Standard) ---
            message = `
👤 *NEW SOLO REGISTRATION RECEIVED*

👤 *Name:* ${playerName}
🎮 *UID:* \`${freeFireUID}\`
📧 *Email:* ${email}
📞 *Phone:* ${phone}

💸 *PAYMENT INFO*
Method: ${paymentMethod}
Status: *Review Screenshot Below*
`;
        }

        // 4. Send to Telegram
        // Send Text
        await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
        
        // Send Screenshot
        await bot.sendPhoto(process.env.TELEGRAM_CHAT_ID, imageUrl);

        // 5. Success Response
        res.json({ 
            success: true, 
            message: 'Registration successful! Data sent to admin.',
            imageUrl: imageUrl 
        });

    } catch (error) {
        console.error('❌ SERVER ERROR:', error);
        res.status(500).json({ success: false, message: 'Server internal error. Contact support.' });
    }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`⚡ Server running on port ${PORT}`);
});