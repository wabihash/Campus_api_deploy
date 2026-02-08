const express = require('express');
const PORT = 5400;
const cors = require('cors');
require('dotenv').config();
const app = express();
//Middleware
app.use(cors({ 
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

const UserRoute = require('./routes/UserRoute');
const QuestionRoute = require('./routes/QuestionRoute');
const campusRoute = require('./routes/CampusRoute');       
const departmentRoute = require('./routes/DepartmentRoute')
const answerRoute = require('./routes/AnswerRoute') 
//Routes
app.use('/api/answers',answerRoute)
app.use('/api/users',UserRoute)
app.use('/api/questions',QuestionRoute)
app.use('/api/campus',campusRoute)
app.use('/api/departments',departmentRoute)

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});