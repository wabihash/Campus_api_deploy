const db = require('../db/DbConfig');
const { StatusCodes } = require('http-status-codes'); // Add this

exports.getNotifications = async (req, res) => {
    try {
        const userid = req.user.userid;
        const [rows] = await db.query(
            'SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 15',
            [userid]
        );
        res.status(StatusCodes.OK).json({ success: true, notifications: rows });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Fetch failed' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const userid = req.user.userid;
        const { id } = req.params; // Get the ID from the URL if it exists

        if (id) {
            // SCENARIO 1: Mark ONE specific notification as read
            await db.query(
                'UPDATE notifications SET is_read = TRUE WHERE id = ? AND recipient_id = ?',
                [id, userid]
            );
            return res.status(StatusCodes.OK).json({ success: true, message: 'Notification marked as read' });
        } else {
            // SCENARIO 2: Mark ALL notifications as read
            await db.query(
                'UPDATE notifications SET is_read = TRUE WHERE recipient_id = ?',
                [userid]
            );
            return res.status(StatusCodes.OK).json({ success: true, message: 'All notifications cleared' });
        }
    } catch (err) {
        console.error(err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false });
    }
};
// Add this to your notificationController.js

exports.clearAllNotifications = async (req, res) => {
    try {
        const userid = req.user.userid;
        
        // This ONLY deletes from the notifications table
        await db.query(
            'DELETE FROM notifications WHERE recipient_id = ?',
            [userid]
        );
        
        res.status(StatusCodes.OK).json({ 
            success: true, 
            message: 'Notification history cleared' 
        });
    } catch (err) {
        console.error(err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: 'Clear failed' 
        });
    }
};