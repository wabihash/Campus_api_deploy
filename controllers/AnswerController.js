const db = require('../db/DbConfig');

// POST: Toggle Upvote (Like/Unlike)
exports.toggleVote = async (req, res) => {
    try {
        const { answer_id } = req.body;
        const userid = req.user.userid; // Consistent with your schema

        // 1. Check if the vote already exists
        const [existing] = await db.query(
            'SELECT * FROM votes WHERE userid = ? AND answer_id = ?',
            [userid, answer_id]
        );

        if (existing.length > 0) {
            // 2. If it exists, remove it (Unlike)
            await db.query('DELETE FROM votes WHERE userid = ? AND answer_id = ?', [userid, answer_id]);
            return res.json({ success: true, message: 'Vote removed', voted: false });
        } else {
            // 3. If it doesn't, add it (Like)
            await db.query('INSERT INTO votes (userid, answer_id) VALUES (?, ?)', [userid, answer_id]);
            return res.json({ success: true, message: 'Vote added', voted: true });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Voting failed' });
    }
};

// GET answers (Updated with Vote Count and User Status)
exports.getAnswersByQuestion = async (req, res) => {
    try {
        const question_id = req.params.id;
        const userid = req.user ? req.user.userid : null; // Check if user is logged in

        const [answers] = await db.query(`
            SELECT 
                a.id, a.content, a.created_at, u.username,
                (SELECT COUNT(*) FROM votes WHERE answer_id = a.id) AS vote_count,
                (SELECT COUNT(*) FROM votes WHERE answer_id = a.id AND userid = ?) AS user_voted,
                CASE
                    WHEN TIMESTAMPDIFF(MINUTE, a.created_at, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, a.created_at, NOW()), 'm ago')
                    WHEN TIMESTAMPDIFF(HOUR, a.created_at, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, a.created_at, NOW()), 'h ago')
                    ELSE CONCAT(TIMESTAMPDIFF(DAY, a.created_at, NOW()), 'd ago')
                END AS time_ago
            FROM answers a
            JOIN users u ON a.user_id = u.userid
            WHERE a.question_id = ?
            ORDER BY vote_count DESC, a.created_at ASC
        `, [userid, question_id]);

        res.json({ success: true, answers });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ... existing imports ...
exports.addAnswer = async (req, res) => {
    try {
        const { question_id, content } = req.body;
        const userid = req.user.userid; 
        const username = req.user.username; // Ensure your authMiddleware provides this

        if (!question_id || !content) {
            return res.status(400).json({ success: false, message: 'Required fields missing' });
        }

        const [result] = await db.query(
            'INSERT INTO answers (question_id, user_id, content, created_at) VALUES (?, ?, ?, NOW())',
            [question_id, userid, content]
        );

        // --- NEW NOTIFICATION LOGIC ---
        // 1. Find the person who asked the question
        const [questionOwner] = await db.query(
            'SELECT userid FROM questions WHERE id = ?', 
            [question_id]
        );

        if (questionOwner.length > 0) {
           const recipientId = questionOwner[0]?.userid; 

if (recipientId && recipientId !== userid) {
                await db.query(
                    'INSERT INTO notifications (recipient_id, sender_id, question_id, message) VALUES (?, ?, ?, ?)',
                    [recipientId, userid, question_id, `${username} answered your question!`]
                );
            }
        }
        // ------------------------------

        res.json({ success: true, message: 'Answer posted', answer_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
// DELETE: Remove an answer
exports.deleteAnswer = async (req, res) => {
    try {
        const { id } = req.params; // Answer ID
        const userid = req.user.userid; 

        // Delete only if the answer belongs to the logged-in user
        const [result] = await db.query(
            'DELETE FROM answers WHERE id = ? AND user_id = ?',
            [id, userid]
        );

        if (result.affectedRows === 0) {
            return res.status(403).json({ 
                success: false, 
                message: "Unauthorized or answer not found" 
            });
        }

        res.json({ success: true, message: 'Answer deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Delete failed' });
    }
};
// PUT: Update an answer
exports.editAnswer = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userid = req.user.userid;

        if (!content) return res.status(400).json({ message: "Content is required" });

        const [result] = await db.query(
            'UPDATE answers SET content = ? WHERE id = ? AND user_id = ?',
            [content, id, userid]
        );

        if (result.affectedRows === 0) {
            return res.status(403).json({ success: false, message: "Unauthorized or not found" });
        }

        res.json({ success: true, message: 'Answer updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Update failed' });
    }
};