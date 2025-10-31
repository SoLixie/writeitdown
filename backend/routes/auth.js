const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { randomBytes, scryptSync, timingSafeEqual } = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Helper: hash password
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

// Helper: verify password safely
function verifyPassword(stored, passwordAttempt) {
  if (!stored) return false;
  const parts = stored.split(':');
  if (parts.length !== 2) return false;

  const [salt, key] = parts;
  const hashAttempt = scryptSync(passwordAttempt, salt, 64).toString('hex');

  try {
    return timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(hashAttempt, 'hex'));
  } catch {
    return false;
  }
}

// ===== REGISTER =====
router.post('/register', async (req, res) => {
  try {
    const { nickname, password } = req.body;
    if (!nickname || !password) return res.status(400).json({ message: 'Missing nickname or password' });

    const existingUser = await User.findOne({ nickname });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashed = hashPassword(password);
    const user = await User.create({ nickname, password: hashed });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    
    // Return the response format that frontend expects
    res.json({ 
      token,
      user: {
        id: user._id,
        nickname: user.nickname
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ===== LOGIN =====
router.post('/login', async (req, res) => {
  try {
    const { nickname, password } = req.body;
    if (!nickname || !password) return res.status(400).json({ message: 'Missing nickname or password' });

    const user = await User.findOne({ nickname });
    if (!user) return res.status(400).json({ message: 'User not found' });
    if (!user.password) return res.status(500).json({ message: 'User password not set' });

    const isValid = verifyPassword(user.password, password);
    if (!isValid) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    
    // Return the response format that frontend expects
    res.json({ 
      token,
      user: {
        id: user._id,
        nickname: user.nickname
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router;