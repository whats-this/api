const snekfetch = require('snekfetch');
const crypto = require('crypto');
const db = require('./database');

module.exports = ({
  key,
  contentType,
  body
}) => {
  const hash = crypto.createHash('md5').update(body).digest('hex');
  let fid;

  return snekfetch.get(`${process.env.SEAWEED_HOST}/dir/assign`)
    .then(assigned => {
      fid = assigned.body.fid;
      return snekfetch.put(`http://${assigned.body.url}/${fid}`).attach('file', body, key);
    })
    .then(() => {
      return db.query({
        name: 'add-file',
        text: 'INSERT INTO objects (bucket_key, bucket, key, dir, backend_file_id, content_type, md5_hash) VALUES ($1, \'public\', $2, \'/\', $3, $4, $5);'
      }, [`public/${key}`, `/${key}`, fid, contentType, hash]);
    });
};
