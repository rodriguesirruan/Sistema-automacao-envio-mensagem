const express = require('express');
const { adminUser, adminPassword } = require('../config');

const router = express.Router();

router.post('/login', (req, res) => {
  const { usuario, senha } = req.body;

  if (usuario === adminUser && senha === adminPassword) {
    req.session.authenticated = true;
    return res.redirect('/');
  }

  return res.redirect('/login?erro=1');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
