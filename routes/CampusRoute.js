const express = require('express');
const router = express.Router();
const { addCampus, getCampus, updateCampus,deleteCampus } = require('../controllers/CampusController');
const authMiddleware = require('../middlewares/AuthMiddleware');
const adminMiddleware = require('../middlewares/AdminMiddleware'); 

// GET all campuses (Public)
router.get('/', getCampus);
// DELETE a campus (Admin Only)
router.delete('/delete/:id', authMiddleware, adminMiddleware, deleteCampus);
// POST a new campus (Admin Only)
router.post('/add', authMiddleware, adminMiddleware, addCampus);

// PUT update an existing campus (Admin Only)
router.put('/update/:id', authMiddleware, adminMiddleware, updateCampus);

module.exports = router;