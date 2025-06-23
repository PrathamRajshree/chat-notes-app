const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/User');

// Sign Up Route
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  try {
    await User.create({ name, email, password: hashed });
    res.redirect('/login.html');
  } catch (e) {
    res.send("User already exists or error: " + e.message);
  }
});

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.send("User not found");

  const match = await bcrypt.compare(password, user.password);
  if (match) {
    req.session.user = user;
    res.redirect('/dashboard.html');
  } else {
    res.send("Incorrect credentials");
  }
});

// Logout Route
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

module.exports = router;
