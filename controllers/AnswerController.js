const db = require('../db/DbConfig');

// POST: Toggle Upvote (Like/Unlike)
exports.toggleVote = async (req, res) => {
    try {
        const { answer_id } = req.body;
        const userid = req.user.userid; // Your 'votes' table uses 'userid'

        // 1. Check if the vote already exists
        const [existing] = await db.query(
            'SELECT * FROM votes WHERE userid = ? AND answer_id = ?',
            [userid, answer_id]
        );

        if (existing.length > 0) {
            // 2. Remove if exists
            await db.query('DELETE FROM votes WHERE userid = ? AND answer_id = ?', [userid, answer_id]);
            return res.json({ success: true, message: 'Vote removed', voted: false });
        } else {
            // 3. Add if doesn't exist
            await db.query('INSERT INTO votes (userid, answer_id) VALUES (?, ?)', [userid, answer_id]);
            
            // Trigger Notification for the LIKE
            const [answerData] = await db.query('SELECT user_id FROM answers WHERE id = ?', [answer_id]);
            if (answerData.length > 0 && answerData[0].user_id !== userid) {
                await db.query(
                    'INSERT INTO notifications (recipient_id, sender_id, message) VALUES (?, ?, ?)',
                    [answerData[0].user_id, userid, `${req.user.username} liked your answer!`]
                );
            }
            return res.json({ success: true, message: 'Vote added', voted: true });
        }
    } catch (err) {
        console.error(err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Voting failed' });
    }
};

// GET answers (Updated with Vote Count and User Status)
exports.getAnswersByQuestion = async (req, res) => {
    try {
        const question_id = req.params.id;
        const userid = req.user ? req.user.userid : null;

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
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false });
    }
};
// ... existing imports ...
exports.addAnswer = async (req, res) => {
    try {
        const { question_id, content } = req.body;
        const userid = req.user.userid; 
        const username = req.user.username;

        if (!question_id || !content) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Fields missing' });
        }

        const [result] = await db.query(
            'INSERT INTO answers (question_id, user_id, content) VALUES (?, ?, ?)',
            [question_id, userid, content]
        );

        // Notify Question Owner
        const [owner] = await db.query('SELECT userid FROM questions WHERE id = ?', [question_id]);
        if (owner.length > 0 && owner[0].userid !== userid) {
            await db.query(
                'INSERT INTO notifications (recipient_id, sender_id, question_id, message) VALUES (?, ?, ?, ?)',
                [owner[0].userid, userid, question_id, `${username} answered your question!`]
            );
        }

        res.json({ success: true, message: 'Answer posted', answer_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false });
    }
};

// DELETE: Remove Answer
exports.deleteAnswer = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM answers WHERE id = ? AND user_id = ?', [id, req.user.userid]);
        if (result.affectedRows === 0) return res.status(StatusCodes.FORBIDDEN).json({ message: "Denied" });
        res.json({ success: true, message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ success: false });
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