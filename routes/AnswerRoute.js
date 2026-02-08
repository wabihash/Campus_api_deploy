const express = require('express');
const router = express.Router();
const { addAnswer, getAnswersByQuestion, toggleVote, deleteAnswer, editAnswer } = require('../controllers/AnswerController');
const authMiddleware = require('../middlewares/AuthMiddleware');
// POST an answer
router.post('/add', authMiddleware, addAnswer);
// DELETE an answer
router.delete('/:id', authMiddleware, deleteAnswer);
// POST a vote (Toggle)
router.post('/vote', authMiddleware, toggleVote);
// Edit an answer
router.put('/:id', authMiddleware, editAnswer); 
// GET answers - We use authMiddleware here optionally so we can check user_voted status
router.get('/question/:id', authMiddleware, getAnswersByQuestion);

module.exports = router;