const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Entry = require('../models/Entry');

// Get all entries for logged-in user
router.get('/', auth, async (req, res) => {
    try {
        const entries = await Entry.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(entries);
    } catch(err) { 
        console.error('Get entries error:', err);
        res.status(500).json({ message: 'Server error' }); 
    }
});

// Add entry
router.post('/', auth, async (req, res) => {
    const { title, content } = req.body;
    try {
        if (!title || !content) {
            return res.status(400).json({ message: 'Title and content are required' });
        }
        const entry = new Entry({ title, content, user: req.user.id });
        await entry.save();
        res.json(entry);
    } catch(err) { 
        console.error('Create entry error:', err);
        res.status(500).json({ message: 'Server error' }); 
    }
});

// Update entry
router.put('/:id', auth, async (req, res) => {
    const { title, content } = req.body;
    try {
        if (!title || !content) {
            return res.status(400).json({ message: 'Title and content are required' });
        }
        const entry = await Entry.findOne({ _id: req.params.id, user: req.user.id });
        if(!entry) return res.status(404).json({ message: 'Entry not found' });

        entry.title = title;
        entry.content = content;
        entry.updatedAt = Date.now();
        await entry.save();
        res.json(entry);
    } catch(err) { 
        console.error('Update entry error:', err);
        res.status(500).json({ message: 'Server error' }); 
    }
});

// Toggle favorite - FIXED: Use PATCH instead of PUT
router.patch('/:id/favorite', auth, async (req, res) => {
    try {
        const entry = await Entry.findOne({ _id: req.params.id, user: req.user.id });
        if(!entry) return res.status(404).json({ message: 'Entry not found' });

        entry.favorite = !entry.favorite;
        await entry.save();
        res.json(entry);
    } catch(err) { 
        console.error('Favorite toggle error:', err);
        res.status(500).json({ message: 'Server error' }); 
    }
});

// Delete entry
router.delete('/:id', auth, async (req, res) => {
    try {
        const entry = await Entry.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if(!entry) return res.status(404).json({ message: 'Entry not found' });
        res.json({ message: 'Entry deleted' });
    } catch(err) { 
        console.error('Delete entry error:', err);
        res.status(500).json({ message: 'Server error' }); 
    }
});

module.exports = router;