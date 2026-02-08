const db = require('../db/DbConfig');

// Add a question
exports.addQuestion = async (req, res) => {
  try {
    const { title, description, tag, campus_id, department_id, course_id } = req.body;
    const userid = req.user.userid;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required' });
    }

    const [result] = await db.query(
      'INSERT INTO questions (userid, campus_id, course_id, department_id, title, description, tag, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [userid, campus_id || null, course_id || null, department_id || null, title, description, tag || null]
    );

    res.json({ success: true, message: 'Question posted', question_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all questions
exports.getAllQuestions = async (req, res) => {
  try {
    const [questions] = await db.query(`
      SELECT q.*, u.username, c.place_type as campus, d.name as department,
        CASE
          WHEN TIMESTAMPDIFF(MINUTE, q.created_at, NOW()) < 60
            THEN CONCAT(TIMESTAMPDIFF(MINUTE, q.created_at, NOW()), ' minutes ago')
          WHEN TIMESTAMPDIFF(HOUR, q.created_at, NOW()) < 24
            THEN CONCAT(TIMESTAMPDIFF(HOUR, q.created_at, NOW()), ' hours ago')
          ELSE CONCAT(TIMESTAMPDIFF(DAY, q.created_at, NOW()), ' days ago')
        END AS time_ago
      FROM questions q
      JOIN users u ON q.userid = u.userid
      LEFT JOIN campus c ON q.campus_id = c.id
      LEFT JOIN departments d ON q.department_id = d.id
      ORDER BY q.created_at DESC
    `);

    res.json({ success: true, questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get a single question by ID
exports.getQuestionById = async (req, res) => {
  try {
    const question_id = req.params.id;
    const [question] = await db.query(`
      SELECT q.*, u.username, c.place_type as campus, d.name as department,
        CASE
          WHEN TIMESTAMPDIFF(MINUTE, q.created_at, NOW()) < 60
            THEN CONCAT(TIMESTAMPDIFF(MINUTE, q.created_at, NOW()), ' minutes ago')
          WHEN TIMESTAMPDIFF(HOUR, q.created_at, NOW()) < 24
            THEN CONCAT(TIMESTAMPDIFF(HOUR, q.created_at, NOW()), ' hours ago')
          ELSE CONCAT(TIMESTAMPDIFF(DAY, q.created_at, NOW()), ' days ago')
        END AS time_ago
      FROM questions q
      JOIN users u ON q.userid = u.userid
      LEFT JOIN campus c ON q.campus_id = c.id
      LEFT JOIN departments d ON q.department_id = d.id
      WHERE q.id = ?
    `, [question_id]);

    if (!question.length) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    res.json({ success: true, question: question[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get questions by campus
exports.getQuestionsByCampus = async (req, res) => {
  try {
    const campus_id = req.params.campus_id;
    const [questions] = await db.query(`
      SELECT q.*, u.username, c.place_type as campus, d.name as department,
        CASE
          WHEN TIMESTAMPDIFF(MINUTE, q.created_at, NOW()) < 60
            THEN CONCAT(TIMESTAMPDIFF(MINUTE, q.created_at, NOW()), ' minutes ago')
          WHEN TIMESTAMPDIFF(HOUR, q.created_at, NOW()) < 24
            THEN CONCAT(TIMESTAMPDIFF(HOUR, q.created_at, NOW()), ' hours ago')
          ELSE CONCAT(TIMESTAMPDIFF(DAY, q.created_at, NOW()), ' days ago')
        END AS time_ago
      FROM questions q
      JOIN users u ON q.userid = u.userid
      LEFT JOIN campus c ON q.campus_id = c.id
      LEFT JOIN departments d ON q.department_id = d.id
      WHERE q.campus_id = ?
      ORDER BY q.created_at DESC
    `, [campus_id]);

    res.json({ success: true, questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get questions by department
exports.getQuestionsByDepartment = async (req, res) => {
  try {
    const department_id = req.params.department_id;
    const [questions] = await db.query(`
      SELECT q.*, u.username, c.place_type as campus, d.name as department,
        CASE
          WHEN TIMESTAMPDIFF(MINUTE, q.created_at, NOW()) < 60
            THEN CONCAT(TIMESTAMPDIFF(MINUTE, q.created_at, NOW()), ' minutes ago')
          WHEN TIMESTAMPDIFF(HOUR, q.created_at, NOW()) < 24
            THEN CONCAT(TIMESTAMPDIFF(HOUR, q.created_at, NOW()), ' hours ago')
          ELSE CONCAT(TIMESTAMPDIFF(DAY, q.created_at, NOW()), ' days ago')
        END AS time_ago
      FROM questions q
      JOIN users u ON q.userid = u.userid
      LEFT JOIN campus c ON q.campus_id = c.id
      LEFT JOIN departments d ON q.department_id = d.id
      WHERE q.department_id = ?
      ORDER BY q.created_at DESC
    `, [department_id]);

    res.json({ success: true, questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET: Questions by logged-in user
exports.getMyQuestions = async (req, res) => {
  try {
    const userid = req.user.userid;

    const [questions] = await db.query(
      `SELECT q.id, q.title, q.description, q.created_at,
      (SELECT COUNT(*) FROM answers WHERE question_id = q.id) AS answer_count
      FROM questions q 
      WHERE q.userid = ? 
      ORDER BY q.created_at DESC`, 
      [userid]
    );

    res.json({ success: true, questions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE: Question (Owner only)
exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const userid = req.user.userid;

    const [result] = await db.query(
      'DELETE FROM questions WHERE id = ? AND userid = ?',
      [id, userid]
    );

    if (result.affectedRows === 0) {
      return res.status(403).json({ message: "Unauthorized or not found" });
    }

    res.json({ success: true, message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Delete failed' });
  }
};

// 🛡️ ADMIN DELETE: Question (Any question)
exports.adminDeleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, message: "Forbidden: Admins only" });
    }

    // Clear answers first due to foreign key constraints
    await db.query('DELETE FROM answers WHERE question_id = ?', [id]);
    const [result] = await db.query('DELETE FROM questions WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    res.json({ success: true, message: 'Question removed by Admin' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Admin delete failed' });
  }
};

// PUT: Edit a question
exports.editQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const userid = req.user.userid;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    const [result] = await db.query(
      'UPDATE questions SET title = ?, description = ? WHERE id = ? AND userid = ?',
      [title, description, id, userid]
    );

    if (result.affectedRows === 0) {
      return res.status(403).json({ success: false, message: "Unauthorized or not found" });
    }

    res.json({ success: true, message: 'Question updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};