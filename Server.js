// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const PORT = process.env.PORT || 5400;
const app = express();

// 1. Updated Allowed Origins
const allowedOrigins = [
  'https://campus-forum.netlify.app',
  'https://campus-hub-omega-ashen.vercel.app', // Added your Vercel production URL explicitly
  'http://localhost:5173'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');

    if (isAllowed) {
      callback(null, true);
    } else {
      // Log this so you can see the blocked URL in Render's logs
      console.log("CORS blocked origin:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200 // Responds to preflight with 200 instead of 204
};

// 2. Apply CORS middleware FIRST
app.use(cors(corsOptions));

// 3. Removed the app.options('*') line that caused the crash. 
// The cors() middleware above already handles OPTIONS requests.

app.use(express.json());

// ===== ROUTES =====
const UserRoute = require('./routes/UserRoute');
const QuestionRoute = require('./routes/QuestionRoute');
const CampusRoute = require('./routes/CampusRoute'); 
const DepartmentRoute = require('./routes/DepartmentRoute');
const AnswerRoute = require('./routes/AnswerRoute');

app.use('/answers', AnswerRoute);
app.use('/users', UserRoute);
app.use('/questions', QuestionRoute);
app.use('/campus', CampusRoute);
app.use('/departments', DepartmentRoute);

// ===== START SERVER =====
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});