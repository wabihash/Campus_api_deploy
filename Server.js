// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Use cloud-provided port or fallback
const PORT = process.env.PORT || 5400;

const app = express();

// Allowed origins
const allowedOrigins = [
  'https://campus-forum.netlify.app',
  'http://localhost:5173'
];

// CORS options (works for Netlify, Vercel previews, localhost)
const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like Postman)
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.includes('.vercel.app')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
};

// Apply CORS middleware BEFORE routes
app.use(cors(corsOptions));

// Handle preflight requests globally
app.options('*', cors(corsOptions));

// Built-in middleware to parse JSON
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
// Bind to 0.0.0.0 for cloud hosting (Render)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
