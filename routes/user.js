const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/firebaseAuth');
const User = require('../models/user');

router.post('/profile', verifyToken, async (req, res) => {
  try {
    const { displayName } = req.body;
    if (!displayName) {
      return res.status(400).json({ error: 'Display name is required' });
    }
    let user = await User.findOne({ uid: req.user.uid });
    if (user) {
      user.displayName = displayName;
      user.updatedAt = new Date();
      await user.save();
    } else {
      user = new User({
        uid: req.user.uid,
        displayName,
        email: req.user.email,
        photoUrl: req.user.picture,
      });
      await user.save();
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});

router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
  }
});

router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { displayName } = req.body;
    if (!displayName) {
      return res.status(400).json({ error: 'Display name is required' });
    }
    const user = await User.findOne({ uid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.displayName = displayName;
    user.updatedAt = new Date();
    await user.save();
    res.status(200).json(user);
  } catch (error) {
    console.error('Error updating display name:', error);
    res.status(500).json({ error: 'Failed to update display name', details: error.message });
  }
});

router.post('/profile/picture', verifyToken, async (req, res) => {
  try {
    const { photoUrl } = req.body; // Assuming photoUrl is sent in body (adjust if using multer)
    if (!photoUrl) {
      return res.status(400).json({ error: 'Photo URL is required' });
    }
    const user = await User.findOne({ uid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.photoUrl = photoUrl;
    user.updatedAt = new Date();
    await user.save();
    res.status(200).json({ photoUrl: user.photoUrl });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    res.status(500).json({ error: 'Failed to update profile picture', details: error.message });
  }
});

router.get('/search', verifyToken, async (req, res) => {
  try {
    const query = req.query.q || '';
    let users;
    if (query.trim() === '') {
      // Return all users except the current user, sorted by displayName
      users = await User.find({ uid: { $ne: req.user.uid } })
        .select('uid displayName email photoUrl')
        .sort({ displayName: 1 }); // Lexicographical sort
    } else {
      // Search by displayName
      users = await User.find({
        displayName: { $regex: query, $options: 'i' },
        uid: { $ne: req.user.uid },
      }).select('uid displayName email photoUrl');
    }
    res.status(200).json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users', details: error.message });
  }
});

module.exports = router;