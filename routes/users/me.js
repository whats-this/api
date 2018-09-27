module.exports = (req, res) => {
  return res.end(200, JSON.stringify({
    success: true,
    errorcode: null,
    user: {
      user_id: req.userId,
      email: req.email,
      is_admin: req.isAdmin,
      username: req.username
    }
  });
}
