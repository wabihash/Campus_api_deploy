const express = require('express');
const PORT = 5400;
const cors = require('cors');
require('dotenv').config();
const app = express();
//Middleware
const corsOptions = {
  origin: [
    'https://campus-forum.netlify.app', // Your live Netlify URL
    'http://localhost:5173'             // Keep this so you can still test locally
  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 200 
};
app.use(cors(corsOptions));
app.use(express.json());

const UserRoute = require('./routes/UserRoute');
const QuestionRoute = require('./routes/QuestionRoute');
const campusRoute = require('./routes/CampusRoute');       
const departmentRoute = require('./routes/DepartmentRoute')
const answerRoute = require('./routes/AnswerRoute') 
//Routes
app.use('/answers',answerRoute)
app.use('/users',UserRoute)
app.use('/questions',QuestionRoute)
app.use('/campus',campusRoute)
app.use('/departments',departmentRoute)

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});