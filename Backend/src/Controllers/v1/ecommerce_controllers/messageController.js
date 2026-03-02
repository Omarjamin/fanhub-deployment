import MessageModel from '../../../Models/ecommerce_model/MessageModel.js';
import { saveMessageToFile } from '../../../utils/conversationFileManager.js';

class MessageController {
    constructor() {
        this.messageModel = new MessageModel();
    }
    // Send a message
    async sendMessage(req, res) {
  try {
    const { receiver_id, content } = req.body;
    const sender_id = req.user?.user_id || res.locals.userId;
    if (!receiver_id || !content)
      return res.status(400).json({ error: 'receiver_id and content are required.' });

    await this.messageModel.sendMessage(sender_id, receiver_id, content);

    const messageData = {
      sender_id,
      receiver_id,
      content,
      timestamp: new Date().toISOString()
    };

    // Save message to text file in BiniCommunity folder
    await saveMessageToFile(sender_id, receiver_id, content, messageData.timestamp);

    /* real-time message */
    req.io.to(receiver_id).emit('receive_message', messageData);
    req.io.to(sender_id).emit('message_sent', messageData);

    /* real-time unread badge */
    const unreadCount = await this.messageModel.getUnreadCount(receiver_id);
    req.io.to(receiver_id).emit('unread_count_update', { unread_count: unreadCount });

    res.status(201).json({ success: true, message: 'Message sent.', data: messageData });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
}
    // Get messages between current user and another user
    async getMessages(req, res) {
        try {
            const userId = req.params.userId;
            const myId = req.user?.user_id || res.locals.userId;

            if (!userId) {
                return res.status(400).json({ error: 'userId is required.' });
            }

            const rows = await this.messageModel.getMessages(myId, userId);

            res.status(200).json(rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    }
    // Get preview messages for chat list
    async getMessagePreviews(req, res) {
    try {
      const myId = req.user?.user_id || res.locals.userId;
      if (!myId) return res.status(401).json({ error: 'Unauthorized' });

      const previews = await this.messageModel.getMessagePreviews(myId);
      res.status(200).json(previews);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load message previews' });
    }
  }

  async markAsRead(req, res) {
    try {
      const myId     = req.user?.user_id || res.locals.userId;
      const senderId = req.params.senderId;
      if (!senderId) return res.status(400).json({ error: 'senderId required' });

      const affected = await this.messageModel.markAsRead(myId, senderId);
      res.json({ success: true, affected });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to mark as read' });
    }
  }
}

export default MessageController;