const express = require('express');
const router = express.Router();
const { 
  addQuestion, 
  getAllQuestions, 
  getQuestionById,
  getQuestionsByCampus, 
  getQuestionsByDepartment,
  getMyQuestions,
  deleteQuestion,
  adminDeleteQuestion, // Imported the new admin controller
  editQuestion
} = require('../controllers/QuestionController');
// Import the new notification controllers
const { getNotifications, markAsRead, clearAllNotifications } = require('../controllers/NotificationController');
const authMiddleware = require('../middlewares/AuthMiddleware');
// --- NOTIFICATION ROUTES ---
router.get('/notifications', authMiddleware, getNotifications);
router.put('/notifications/read', authMiddleware, markAsRead);
router.put('/notifications/:id/read', authMiddleware, markAsRead);
router.delete('/notifications/clear', authMiddleware, clearAllNotifications);
// --- ADMIN ROUTES ---
// This matches the URL we used in your AdminDashboard.jsx
router.delete('/admin/delete/:id', authMiddleware, adminDeleteQuestion);

// --- YOUR EXISTING ROUTES ---
router.get('/my-questions', authMiddleware, getMyQuestions);
router.delete('/:id', authMiddleware, deleteQuestion);
router.post('/add', authMiddleware, addQuestion);
router.put('/:id', authMiddleware, editQuestion);
router.get('/', getAllQuestions);
router.get('/:id', getQuestionById);
router.get('/campus/:campus_id', getQuestionsByCampus);
router.get('/department/:department_id', getQuestionsByDepartment);
module.exports = router;