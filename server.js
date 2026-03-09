const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- 1. Middleware ---
app.use(cors());
app.use(express.json()); 

const uri = process.env.MONGODB_URI;

// --- 2. การเชื่อมต่อ MongoDB ---
mongoose.connect(uri)
    .then(() => console.log('✅ เชื่อมต่อ MongoDB สำเร็จแล้ว!'))
    .catch((err) => console.error('❌ เชื่อมต่อล้มเหลว:', err.message));

// --- 3. Schema ---
const itemSchema = new mongoose.Schema({
    ItemName: { type: String, required: true },
    Category: { type: String, default: "General" },
    StockQty: { type: Number, default: 0 },
    ExpiryDate: { type: Date, required: true },
    DaysUntilExpiry: Number,
    SuggestedAction: String // สถานะ: none, drop (หมดอายุ), restock (สต็อกต่ำ), discount (ใกล้หมดอายุ)
}, { collection: 'Items', versionKey: false });

const Item = mongoose.model('Item', itemSchema);

// --- ฟังก์ชันช่วยคำนวณสถานะ (Helper Function) ---
const calculateStatus = (expiryDate, stockQty) => {
    const today = new Date();
    const expDate = new Date(expiryDate);
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let action = "none";
    
    // ลำดับความสำคัญ: 1. หมดอายุ > 2. สต็อกต่ำ (<= 20) > 3. ใกล้หมดอายุ
    if (diffDays < 0) {
        action = "drop"; 
    } else if (Number(stockQty) <= 20) {
        action = "restock"; // แจ้งเตือนเมื่อสต็อกน้อยกว่าหรือเท่ากับ 20
    } else if (diffDays <= 7) {
        action = "discount"; 
    }

    return { diffDays, action };
};

// --- API Routes ---

// ดึงข้อมูลทั้งหมด
app.get('/api/items', async (req, res) => {
    try {
        const items = await Item.find();
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// เพิ่มสินค้าใหม่
app.post('/api/items', async (req, res) => {
    try {
        const { ItemName, Category, StockQty, ExpiryDate } = req.body;
        const { diffDays, action } = calculateStatus(ExpiryDate, StockQty);

        const newItem = new Item({
            ItemName,
            Category,
            StockQty: Number(StockQty),
            ExpiryDate: new Date(ExpiryDate),
            DaysUntilExpiry: diffDays,
            SuggestedAction: action
        });

        await newItem.save();
        res.status(201).json(newItem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// อัปเดตข้อมูลสินค้าเก่า (หัวใจสำคัญของการแก้ไข)
app.put('/api/items/:id', async (req, res) => {
    try {
        const { ItemName, Category, StockQty, ExpiryDate } = req.body;
        const { diffDays, action } = calculateStatus(ExpiryDate, StockQty);

        const updatedItem = await Item.findByIdAndUpdate(
            req.params.id, 
            {
                ItemName,
                Category,
                StockQty: Number(StockQty),
                ExpiryDate: new Date(ExpiryDate),
                DaysUntilExpiry: diffDays,
                SuggestedAction: action
            }, 
            { new: true }
        );

        res.json(updatedItem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// ลบสินค้า
app.delete('/api/items/:id', async (req, res) => {
    try {
        await Item.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 API Server running at http://localhost:${PORT}`);
});