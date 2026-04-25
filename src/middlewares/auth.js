function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }

  if (req.path.startsWith('/api')) {
    return res.status(401).json({ error: 'Nao autorizado.' });
  }

  return res.redirect('/login');
}

module.exports = {
  ensureAuthenticated
};