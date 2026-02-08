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
  adminDeleteQuestion,
  editQuestion
} = require('../controllers/QuestionController');

const { getNotifications, markAsRead, clearAllNotifications } = require('../controllers/NotificationController');
const authMiddleware = require('../middlewares/AuthMiddleware');

// --- 1. NOTIFICATION ROUTES (Must be at the top) ---
router.get('/notifications', authMiddleware, getNotifications);
router.put('/notifications/read', authMiddleware, markAsRead);
router.put('/notifications/:id/read', authMiddleware, markAsRead);
router.delete('/notifications/clear', authMiddleware, clearAllNotifications);

// --- 2. ADMIN ROUTES ---
router.delete('/admin/delete/:id', authMiddleware, adminDeleteQuestion);

// --- 3. SPECIFIC USER ROUTES ---
router.get('/my-questions', authMiddleware, getMyQuestions);
router.post('/add', authMiddleware, addQuestion);

// --- 4. GENERAL DATA ROUTES ---
router.get('/', getAllQuestions);
router.get('/campus/:campus_id', getQuestionsByCampus);
router.get('/department/:department_id', getQuestionsByDepartment);

// --- 5. ID PARAMETER ROUTES (Must be at the bottom) ---
router.get('/:id', getQuestionById);
router.delete('/:id', authMiddleware, deleteQuestion);
router.put('/:id', authMiddleware, editQuestion);

module.exports = router;