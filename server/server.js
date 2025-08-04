// File: server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require("socket.io");

// --- Initial Setup ---
// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Database Connection ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB Connected...');
    } catch (err) {
        console.error(`❌ MongoDB Connection Error: ${err.message}`);
        // Exit process with failure
        process.exit(1);
    }
};
connectDB();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // The EXACT origin of your React frontend
        methods: ["GET", "POST"],
        credentials: true
    },
    // Add path to ensure it matches the client's default
    path: "/socket.io/" 
});

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join_assessment_room', (assessmentId) => {
        socket.join(assessmentId);
        console.log(`Socket ${socket.id} joined room: ${assessmentId}`);
    });

    socket.on('violation_event', (data) => {
        console.log(`Violation reported in room ${data.assessmentId}: ${data.type}`);
        // Log this to your database
        // Emit a warning back ONLY to the specific user who caused it
        socket.emit('proctoring_warning', { message: `Warning: ${data.type.replace(/_/g, ' ')} detected.` });
    });

    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
});


// --- Global Middlewares ---
// Enable CORS for all routes
app.use(cors());

// Body parser middleware to handle JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// A simple logger middleware for all incoming requests (optional but helpful)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// --- Feature-Based Routers ---
const authRoutes = require('./src/features/auth/auth.routes');
const dashboardRoutes = require('./src/features/dashboard/dashboard.routes');
const homepageRoutes = require('./src/features/homepage/homepage.routes');
const gradeRoutes = require('./src/features/grades/grades.routes');
const subjectRoutes = require('./src/features/subjects/subjects.routes');
const assessmentRoutes = require('./src/features/assessments/assessments.routes');
const userRoutes = require('./src/features/users/users.routes');
const resultRoutes = require('./src/features/results/results.routes');
const reportRoutes = require('./src/features/reports/reports.routes'); // ✅ your actual routes file
const teacherprofileRoute=require('./src/features/teachers/teachers.routes')
const addStudyMaterialRoute=require('./src/features/study-materials/study-materials.routes')
const adminRoutes=require('./src/features/admin/admin.routes');
const settingsRoutes = require('./src/features/settings/settings.routes');
const notificationRoutes = require('./src/features/notifications/notifications.routes');
const adduserRoutes = require('./src/features/add_user/add_user.routes');
const proctoringRoutes = require('./src/features/proctoring/proctoring.routes');
const analyticsRoutes = require('./src/features/analytics/analytics.routes');
const feedbackRoutes = require('./src/features/feedback/feedback.routes');
const { verifyToken } = require('./src/middlewares/auth.middleware');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);   // For the main student dashboard page
app.use('/api/v1/homepage', homepageRoutes);    // For the homepage/course selection page
app.use('/api/v1/grades', gradeRoutes);         // For the grades/modules page
app.use('/api/v1/subjects', subjectRoutes);     // For listing subjects and their details
app.use('/api/v1/assessments', assessmentRoutes);// For all test-taking logic
app.use('/api/v1/users', userRoutes);           // For user-specific actions like updating a club
app.use('/api/v1/results', resultRoutes);
app.use('/api/v1/reports', reportRoutes); // ✅ ensure this is correct
app.use('/api/v1/teachers', teacherprofileRoute);
app.use('/api/v1/add-study-material', addStudyMaterialRoute);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/add-user', adduserRoutes);
app.use('/api/v1/proctoring', proctoringRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/feedback', verifyToken, feedbackRoutes);

// --- Root Endpoint ---
// A simple health check or welcome message for the API root.
app.get('/', (req, res) => {
    res.send('Assessly API is running...');
});

// --- Global Error Handler (Optional but Recommended) ---
// This middleware will catch any errors that are not handled in your routes.
app.use((err, req, res, next) => {
    console.error('--- UNHANDLED ERROR ---');
    console.error(err.stack);
    res.status(500).send({ message: 'Something went wrong on the server!' });
});


// --- Start Server ---
// Replace app.listen with server.listen
server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});