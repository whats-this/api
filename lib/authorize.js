const db = require('./database.js');
const url = require('url');

/**
 * UUID regex. Taken from StackOverflow.
 * @see {@link http://stackoverflow.com/a/13653180 StackOverflow}
 */
const UUIDRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Handle authorization for the API.
 */
module.exports = (req, res, cb) => {
  const query = url.parse(req.url, true).query;
  const token = req.headers.authorization || query.key || query.apikey;
  if (!UUIDRegex.test(token)) {
    return res.end(401, JSON.stringify({
      success: false,
      errorcode: 401,
      description: 'bad token'
    }));
  }

  // Try to fetch the user from the database
  Promise.resolve()
    .then(() => new Promise((resolve, reject) => {
      db.query({
        name: 'fetch-token-by-token',
        text: 'SELECT user_id FROM tokens WHERE token=$1'
      }, [token], (err, resp) => {
        if (err) reject(err);
        else resolve(resp);
      });
    }))
    .then(resp => new Promise((resolve, reject) => {
      if (resp.rows.length !== 1) {
        return res.end(401, JSON.stringify({
          success: false,
          errorcode: 401,
          description: 'unauthorized'
        }));
      }
      db.query({
        name: 'fetch-user-by-id',
        text: 'SELECT is_blocked FROM users WHERE id=$1'
      }, [resp.rows[0].user_id], (err, resp) => {
        if (err) reject(err);
        else resolve(resp);
      });
    }))
    .then(resp => {
      if (resp.rows.length !== 1) {
        return res.end(401, JSON.stringify({
          success: false,
          errorcode: 401,
          description: 'unauthorized'
        }));
      }
      if (resp.rows[0].is_blocked) {
        return res.end(401, JSON.stringify({
          success: false,
          errorcode: 401,
          description: 'unauthorized'
        }));
      }
    })
    .then(cb)
    .catch(err => {
      console.log('Failed to perform database query');
      console.log(err);
      res.end(500, JSON.stringify({
        success: false,
        errorcode: 500,
        description: 'Internal Server Error'
      }));
    });
};
