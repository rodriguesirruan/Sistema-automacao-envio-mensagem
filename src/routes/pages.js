const path = require('path');
const express = require('express');
const { ensureAuthenticated } = require('../middlewares/auth');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.redirect('/');
  }

  return res.sendFile(path.join(__dirname, '..', '..', 'public', 'login.html'));
});

router.get('/', ensureAuthenticated, (req, res) => {
  return res.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'));
});

module.exports = router;
