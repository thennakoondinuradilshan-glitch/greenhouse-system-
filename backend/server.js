const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const startSimulator = require('./utils/sensorsimulator');


const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '12mb' }));

// Test Route
app.get('/', (req, res) => {
    res.send('Greenhouse Monitoring API is running...');
});

// Routes
app.use('/api/devices', require('./routes/deviceRoutes'));
app.use('/api/sensors', require('./routes/sensorRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/supplies', require('./routes/supplyProductRoutes'));
app.use('/api/supply-orders', require('./routes/supplyOrderRoutes'));
app.use('/api/experts', require('./routes/expertRoutes'));
app.use('/api/problems', require('./routes/problemRoutes'));
app.use('/api/consultations', require('./routes/consultationRoutes'));
app.use('/api/admin/expertconnect', require('./routes/adminExpertRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

if (require.main === module) {
    const port = process.env.PORT || 5000;

    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log('MongoDB Connected Successfully!');
            startSimulator();
            app.listen(port, () => {
                console.log(`Server is running on port: ${port}`);
            });
        })
        .catch((err) => {
            console.error('MongoDB Connection Error:', err.message);
        });
}

module.exports = app;
