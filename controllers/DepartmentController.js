const db = require('../db/DbConfig');

// GET ALL DEPARTMENTS
exports.getDepartments = async (req, res) => {
  try {
    const [departments] = await db.query('SELECT * FROM departments ORDER BY created_at DESC');
    res.json({ success: true, departments });
  } catch (err) {
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
};

// ADD NEW DEPARTMENT
exports.addDepartment = async (req, res) => {
  try {
    const { department_name, description } = req.body;
    if (!department_name) return res.status(400).json({ success: false, message: "Name required" });

    const [result] = await db.query(
      'INSERT INTO departments (name, description) VALUES (?, ?)',
      [department_name, description || ""]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.sqlMessage });
  }
};

// UPDATE DEPARTMENT
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { department_name } = req.body;

    const [result] = await db.query(
      'UPDATE departments SET name = ? WHERE id = ?', 
      [department_name, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    res.json({ success: true, message: 'Updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.sqlMessage });
  }
};
// DELETE DEPARTMENT
exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query('DELETE FROM departments WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.sqlMessage });
  }
};