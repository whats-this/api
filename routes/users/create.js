const db = require('../../lib/database');
const uuid = require('uuid/v4');

function bufferJSON (stream) {
  return new Promise((resolve, reject) => {
    const buffer = [];

    stream.on('data', data => {
      buffer.push(data);
    });

    stream.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(buffer).toString()));
      } catch (e) {
        e.isJSON = true;
        reject(e);
      }
    });

    stream.on('error', reject);
  });
}

module.exports = (req, res) => {
  if (!req.isAdmin) {
    return res.end(403, JSON.stringify({
      success: false,
      errorcode: 403,
      description: 'unauthorized'
    }));
  }

  return bufferJSON(req).then(payload => {
    if (!payload.email || !payload.username) {
      return res.end(400, JSON.stringify({
        success: false,
        errorcode: 400,
        description: 'email or username not provided'
      }));
    }

    return new Promise((resolve, reject) => {
      db.query({
        name: 'get-user-by-username-email',
        text: 'SELECT * FROM users WHERE username=$1 OR email=$2'
      }, [payload.username, payload.email], (err, resp) => {
        if (err) return reject(err);
        resolve({ payload, resp });
      });
    });
  }).then(({ payload, resp }) => {
    if (resp.rows.length) {
      return res.end(409, JSON.stringify({
        success: false,
        errorcode: 409,
        description: 'user with that email or username already exists'
      }));
    }

    return new Promise((resolve, reject) => {
      const id = uuid();

      db.query({
        name: 'add-user',
        text: 'INSERT INTO users (id, username, email) VALUES ($1, $2, $3)'
      }, [id, payload.username, payload.email], err => {
        if (err) return reject(err);
        resolve(id);
      });
    });
  }).then(id => {
    const token = uuid();

    return new Promise((resolve, reject) => {
      db.query({
        name: 'add-token',
        text: 'INSERT INTO tokens (user_id, token) VALUES ($1, $2)'
      }, [id, token], err => {
        if (err) return reject(err);
        resolve({ id, token });
      });
    });
  }).then(({ id, token }) => {
    res.end(200, JSON.stringify({
      success: true,
      errorcode: null,
      id,
      token
    }));
  }).catch(err => {
    if (err.isJSON) {
      return res.end(400, JSON.stringify({
        success: false,
        errorcode: 400,
        description: 'invalid json payload'
      }));
    }
    console.error('internal error');
    console.error(err);
    return res.end(500, JSON.stringify({
      success: false,
      errorcode: 500,
      description: 'internal error occured'
    }));
  });
};
