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

// 1. Setup Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// 2. Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 3. Configure Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'thunderclash_payments',
        allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});

const upload = multer({ storage: storage });

// THE ROUTE
app.post('/register', upload.single('screenshot'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { playerName, freeFireUID, email, phone, paymentMethod } = req.body;
        const imageUrl = req.file.path;

        console.log('--- NEW REGISTRATION ---');
        console.log(`Player: ${playerName}, UID: ${freeFireUID}`);

        // --- SEND TO TELEGRAM ---
        const message = `
🚀 *NEW REGISTRATION RECEIVED*

👤 *Name:* ${playerName}
🎮 *UID:* \`${freeFireUID}\`
📞 *Phone:* ${phone}
📧 *Email:* ${email}
YZ *Method:* ${paymentMethod}

👇 *Payment Screenshot below:*
`;

        // Send Text
        await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
        
        // Send Image
        await bot.sendPhoto(process.env.TELEGRAM_CHAT_ID, imageUrl);

        // Return success to user
        res.json({ 
            success: true, 
            message: 'Registration successful!',
            imageUrl: imageUrl 
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Server error occurred' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});