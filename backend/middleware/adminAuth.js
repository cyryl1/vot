const adminAuth = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized. Admin access required.' });
};

module.exports = adminAuth;
