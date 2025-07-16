const express = require('express');
const app = express();
const PORT = process.env.PORT || 8383;

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => console.log(`Server is running on port:${PORT}`));