// const express = require('express');
// const router = express.Router();
// const verifyToken = require('../middleware/firebaseAuth');
// const Chat = require('../models/chat');
// const Message = require('../models/message');
// const User = require('../models/user');

// // Helper function to get IST timestamp
// const getISTDate = () => {
//   const now = new Date();
//   // IST is UTC+5:30
//   const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
//   return new Date(now.getTime() + istOffset);
// };

// router.post('/', verifyToken, async (req, res) => {
//   try {
//     const { participantId } = req.body;
//     if (!participantId) {
//       return res.status(400).json({ error: 'Participant ID is required' });
//     }
//     // Verify participant exists
//     const participant = await User.findOne({ uid: participantId }, 'uid displayName photoUrl');
//     if (!participant) {
//       return res.status(404).json({ error: 'Participant not found' });
//     }
//     // Normalize participant order to avoid duplicates
//     const participants = [req.user.uid, participantId].sort();
//     // Check for existing chat
//     let chat = await Chat.findOne({ participants });
//     if (chat) {
//       // Populate participants for response
//       const populatedChat = await Chat.findById(chat._id).populate({
//         path: 'lastMessage',
//         select: 'content createdAt',
//       });
//       return res.status(200).json({
//         _id: populatedChat._id,
//         participants: [
//           { uid: req.user.uid, displayName: req.user.name, photoUrl: req.user.picture },
//           { uid: participant.uid, displayName: participant.displayName, photoUrl: participant.photoUrl },
//         ],
//         lastMessage: populatedChat.lastMessage,
//         updatedAt: populatedChat.updatedAt,
//       });
//     }
//     // Create new chat
//     chat = new Chat({ participants, updatedAt: getISTDate() });
//     await chat.save();
//     // Return chat with populated participants
//     res.status(201).json({
//       _id: chat._id,
//       participants: [
//         { uid: req.user.uid, displayName: req.user.name, photoUrl: req.user.picture },
//         { uid: participant.uid, displayName: participant.displayName, photoUrl: participant.photoUrl },
//       ],
//       lastMessage: null,
//       updatedAt: chat.updatedAt,
//     });
//   } catch (error) {
//     console.error('Chat creation error:', error);
//     res.status(500).json({ error: 'Failed to start chat', details: error.message });
//   }
// });

// router.get('/', verifyToken, async (req, res) => {
//   try {
//     const chats = await Chat.find({ participants: req.user.uid })
//       .populate({
//         path: 'lastMessage',
//         select: 'content createdAt',
//       })
//       .sort({ updatedAt: -1 });
//     // Manually populate participants
//     const populatedChats = await Promise.all(
//       chats.map(async (chat) => {
//         const participants = await User.find(
//           { uid: { $in: chat.participants } },
//           'uid displayName photoUrl'
//         );
//         return {
//           _id: chat._id,
//           participants,
//           lastMessage: chat.lastMessage,
//           updatedAt: chat.updatedAt,
//         };
//       })
//     );
//     res.status(200).json(populatedChats);
//   } catch (error) {
//     console.error('Error fetching chats:', error);
//     res.status(500).json({ error: 'Failed to fetch chats', details: error.message });
//   }
// });

// router.post('/:chatId/messages', verifyToken, async (req, res) => {
//   try {
//     const { chatId } = req.params;
//     const { content } = req.body;
//     if (!content) {
//       return res.status(400).json({ error: 'Message content is required' });
//     }
//     const chat = await Chat.findById(chatId);
//     if (!chat || !chat.participants.includes(req.user.uid)) {
//       return res.status(403).json({ error: 'Invalid chat or unauthorized' });
//     }
//     const message = new Message({
//       chatId,
//       senderId: req.user.uid,
//       content,
//       createdAt: getISTDate(),
//     });
//     await message.save();
//     chat.lastMessage = message._id;
//     chat.updatedAt = getISTDate();
//     await chat.save();
//     // Manually fetch sender details
//     const sender = await User.findOne({ uid: message.senderId }, 'uid displayName photoUrl');
//     res.status(201).json({
//       _id: message._id,
//       chatId: message.chatId,
//       senderId: {
//         uid: sender.uid,
//         displayName: sender.displayName,
//         photoUrl: sender.photoUrl,
//       },
//       content: message.content,
//       status: message.status,
//       createdAt: message.createdAt,
//     });
//   } catch (error) {
//     console.error('Message sending error:', error);
//     res.status(500).json({ error: 'Failed to send message', details: error.message });
//   }
// });

// router.get('/:chatId/messages', verifyToken, async (req, res) => {
//   try {
//     const { chatId } = req.params;
//     const chat = await Chat.findById(chatId);
//     if (!chat || !chat.participants.includes(req.user.uid)) {
//       return res.status(403).json({ error: 'Invalid chat or unauthorized' });
//     }
//     const messages = await Message.find({ chatId })
//       .sort({ createdAt: 1 })
//       .limit(50);
//     // Manually populate senderId
//     const populatedMessages = await Promise.all(
//       messages.map(async (message) => {
//         const sender = await User.findOne({ uid: message.senderId }, 'uid displayName photoUrl');
//         return {
//           _id: message._id,
//           chatId: message.chatId,
//           senderId: {
//             uid: sender.uid,
//             displayName: sender.displayName,
//             photoUrl: sender.photoUrl,
//           },
//           content: message.content,
//           status: message.status,
//           createdAt: message.createdAt,
//         };
//       })
//     );
//     res.status(200).json(populatedMessages);
//   } catch (error) {
//     console.error('Error fetching messages:', error);
//     res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
//   }
// });

// module.exports = router;
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/firebaseAuth');
const Chat = require('../models/chat');
const Message = require('../models/message');
const User = require('../models/user');

// Helper function to get IST timestamp
const getISTDate = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  return new Date(now.getTime() + istOffset);
};

// Socket.io event handlers
router.handleSocket = (io, socket) => {
  const userId = socket.user.uid;

  // Join chat rooms
  socket.on('join:chat', ({ chatId }) => {
    socket.join(chatId);
    console.log(`${userId} joined chat ${chatId}`);
  });

  // Typing indicator
  socket.on('typing', ({ chatId, isTyping }) => {
    socket.to(chatId).emit('typing', { userId, isTyping });
  });

  // Mark message as delivered
  socket.on('message:delivered', async ({ messageId, chatId }) => {
    try {
      const message = await Message.findByIdAndUpdate(
        messageId,
        { status: 'delivered' },
        { new: true }
      );
      if (message) {
        io.to(chatId).emit('message:status', {
          messageId,
          status: 'delivered',
        });
      }
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  });

  // Mark message as read
  socket.on('message:read', async ({ messageId, chatId }) => {
    try {
      const message = await Message.findByIdAndUpdate(
        messageId,
        { status: 'read' },
        { new: true }
      );
      if (message) {
        io.to(chatId).emit('message:status', {
          messageId,
          status: 'read',
        });
        // Update unread count
        const unreadCount = await Message.countDocuments({
          chatId,
          status: { $in: ['sent', 'delivered'] },
          senderId: { $ne: userId },
        });
        io.to(userId).emit('unread:count', { chatId, count: unreadCount });
      }
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  });

  // Update last seen
  socket.on('last:seen', async () => {
    try {
      await User.findOneAndUpdate(
        { uid: userId },
        { lastSeen: getISTDate() }
      );
      io.emit('user:lastSeen', { uid: userId, lastSeen: getISTDate() });
    } catch (error) {
      console.error('Error updating last seen:', error);
    }
  });
};

router.post('/', verifyToken, async (req, res) => {
  try {
    const { participantId } = req.body;
    if (!participantId) {
      return res.status(400).json({ error: 'Participant ID is required' });
    }
    const participant = await User.findOne({ uid: participantId }, 'uid displayName photoUrl');
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    const participants = [req.user.uid, participantId].sort();
    let chat = await Chat.findOne({ participants });
    if (chat) {
      const populatedChat = await Chat.findById(chat._id).populate({
        path: 'lastMessage',
        select: 'content createdAt',
      });
      return res.status(200).json({
        _id: populatedChat._id,
        participants: [
          { uid: req.user.uid, displayName: req.user.name, photoUrl: req.user.picture },
          { uid: participant.uid, displayName: participant.displayName, photoUrl: participant.photoUrl },
        ],
        lastMessage: populatedChat.lastMessage,
        updatedAt: populatedChat.updatedAt,
        unreadCount: await Message.countDocuments({
          chatId: chat._id,
          status: { $in: ['sent', 'delivered'] },
          senderId: { $ne: req.user.uid },
        }),
      });
    }
    chat = new Chat({ participants, updatedAt: getISTDate() });
    await chat.save();
    res.status(201).json({
      _id: chat._id,
      participants: [
        { uid: req.user.uid, displayName: req.user.name, photoUrl: req.user.picture },
        { uid: participant.uid, displayName: participant.displayName, photoUrl: participant.photoUrl },
      ],
      lastMessage: null,
      updatedAt: chat.updatedAt,
      unreadCount: 0,
    });
  } catch (error) {
    console.error('Chat creation error:', error);
    res.status(500).json({ error: 'Failed to start chat', details: error.message });
  }
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user.uid })
      .populate({
        path: 'lastMessage',
        select: 'content createdAt',
      })
      .sort({ updatedAt: -1 });
    const populatedChats = await Promise.all(
      chats.map(async (chat) => {
        const participants = await User.find(
          { uid: { $in: chat.participants } },
          'uid displayName photoUrl'
        );
        const unreadCount = await Message.countDocuments({
          chatId: chat._id,
          status: { $in: ['sent', 'delivered'] },
          senderId: { $ne: req.user.uid },
        });
        return {
          _id: chat._id,
          participants,
          lastMessage: chat.lastMessage,
          updatedAt: chat.updatedAt,
          unreadCount,
        };
      })
    );
    res.status(200).json(populatedChats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Failed to fetch chats', details: error.message });
  }
});

router.post('/:chatId/messages', verifyToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.user.uid)) {
      return res.status(403).json({ error: 'Invalid chat or unauthorized' });
    }
    const message = new Message({
      chatId,
      senderId: req.user.uid,
      content,
      createdAt: getISTDate(),
      status: 'sent',
    });
    await message.save();
    chat.lastMessage = message._id;
    chat.updatedAt = getISTDate();
    await chat.save();
    const sender = await User.findOne({ uid: message.senderId }, 'uid displayName photoUrl');
    const messageData = {
      _id: message._id,
      chatId: message.chatId,
      senderId: {
        uid: sender.uid,
        displayName: sender.displayName,
        photoUrl: sender.photoUrl,
      },
      content: message.content,
      status: message.status,
      createdAt: message.createdAt,
    };
    // Emit real-time message
    if (req.io) {
      req.io.to(chatId).emit('message:new', messageData);
      // Update unread count for other participants
      const otherParticipants = chat.participants.filter(uid => uid !== req.user.uid);
      for (const uid of otherParticipants) {
        const unreadCount = await Message.countDocuments({
          chatId,
          status: { $in: ['sent', 'delivered'] },
          senderId: { $ne: uid },
        });
        req.io.to(uid).emit('unread:count', { chatId, count: unreadCount });
      }
    } else {
      console.warn('Socket.io instance not available, message saved but not emitted');
    }
    res.status(201).json(messageData);
  } catch (error) {
    console.error('Message sending error:', error);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

router.get('/:chatId/messages', verifyToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.user.uid)) {
      return res.status(403).json({ error: 'Invalid chat or unauthorized' });
    }
    const messages = await Message.find({ chatId })
      .sort({ createdAt: 1 })
      .limit(50);
    const populatedMessages = await Promise.all(
      messages.map(async (message) => {
        const sender = await User.findOne({ uid: message.senderId }, 'uid displayName photoUrl');
        return {
          _id: message._id,
          chatId: message.chatId,
          senderId: {
            uid: sender.uid,
            displayName: sender.displayName,
            photoUrl: sender.photoUrl,
          },
          content: message.content,
          status: message.status,
          createdAt: message.createdAt,
        };
      })
    );
    res.status(200).json(populatedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
  }
});

module.exports = router;