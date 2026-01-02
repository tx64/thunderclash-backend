require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Configure Storage (Tell Multer to save to Cloudinary)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'thunderclash_payments', // Folder name in Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});

const upload = multer({ storage: storage });

// THE ROUTE
app.post('/register', upload.single('screenshot'), (req, res) => {
    try {
        // Check if file is missing
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const playerData = req.body;
        
        console.log('--- NEW REGISTRATION RECEIVED ---');
        console.log('Player:', playerData.playerName);
        console.log('UID:', playerData.freeFireUID);
        console.log('Image Saved at:', req.file.path); // The Internet URL
        console.log('---------------------------------');

        // Send success response with the image URL
        res.json({ 
            success: true, 
            message: 'Registration successful!',
            imageUrl: req.file.path 
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Server error occurred' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});