const db = require('../db/DbConfig');

// GET ALL LOCATIONS
exports.getCampus = async (req, res) => {
  try {
    const [campus] = await db.query('SELECT * FROM campus ORDER BY created_at DESC');
    res.json({ success: true, campus });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ADD NEW LOCATION
exports.addCampus = async (req, res) => {
  try {
    const { campus_name, description } = req.body;
    if (!campus_name) return res.status(400).json({ success: false, message: "Location name required." });

    const [result] = await db.query(
      'INSERT INTO campus (place_type, description) VALUES (?, ?)',
      [campus_name, description || ""]
    );

    return res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    // Handle specific truncation error if name is too long
    if (err.errno === 1265 || err.code === 'WARN_DATA_TRUNCATED') {
      return res.status(500).json({ 
        success: false, 
        message: "Name too long. Ensure database column is VARCHAR(255)." 
      });
    }
    res.status(500).json({ success: false, message: err.sqlMessage || 'Internal Server Error' });
  }
};

// UPDATE LOCATION
exports.updateCampus = async (req, res) => {
  try {
    const { id } = req.params;
    const { campus_name } = req.body;

    // Use 'id' to match your DESCRIBE campus; results
    const [result] = await db.query(
      "UPDATE campus SET place_type = ? WHERE id = ?", 
      [campus_name, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Location not found" });
    }
 
    res.json({ success: true, message: "Updated successfully" });
  } catch (err) {
    console.error("MYSQL ERROR:", err.sqlMessage || err.message);
    res.status(500).json({ success: false, message: err.sqlMessage || "Server Error" });
  }
};
// DELETE LOCATION
exports.deleteCampus = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query('DELETE FROM campus WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Location not found" });
    }

    res.json({ success: true, message: 'Location deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.sqlMessage });
  }
};