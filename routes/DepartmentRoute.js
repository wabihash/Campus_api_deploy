const express = require('express');
const router = express.Router();
const { addDepartment, getDepartments, updateDepartment,deleteDepartment } = require('../controllers/DepartmentController');
const authMiddleware = require('../middlewares/AuthMiddleware');
const adminMiddleware = require('../middlewares/AdminMiddleware'); 

// GET all departments (Public)
router.get('/', getDepartments);

// POST a new department (Admin Only)
router.post('/add', authMiddleware, adminMiddleware, addDepartment);
// DELETE a department (Admin Only)
router.delete('/delete/:id', authMiddleware, adminMiddleware, deleteDepartment);
// PUT update an existing department (Admin Only)
router.put('/update/:id', authMiddleware, adminMiddleware, updateDepartment);

module.exports = router;