const express = require('express');
const cors = require('cors');
require('dotenv').config();

// FIX: Use the port provided by the cloud environment
const PORT = process.env.PORT || 5400; 

const app = express();

const allowedOrigins = [
  'https://campus-forum.netlify.app',
  'http://localhost:5173'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (
      !origin || // mobile apps, Postman
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};


app.use(cors(corsOptions));
app.use(express.json());

// Routes
const UserRoute = require('./routes/UserRoute');
const QuestionRoute = require('./routes/QuestionRoute');
const campusRoute = require('./routes/CampusRoute'); 
const departmentRoute = require('./routes/DepartmentRoute');
const answerRoute = require('./routes/AnswerRoute');

app.use('/answers', answerRoute);
app.use('/users', UserRoute);
app.use('/questions', QuestionRoute);
app.use('/campus', campusRoute);
app.use('/departments', departmentRoute);

// FIX: Bind to 0.0.0.0 so Render can route traffic to it
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});