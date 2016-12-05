'use strict';

// Required modules
const crypto = require('crypto');
const Dicer = require('dicer');
const fileType = require('file-type');
const S3 = require('../../lib/filestore.js');

// Load configuration
const config = require('../../config.json');

// Create regexes
// Content-Disposition filename regex: "filename=xxx"
const ContentDispositionFilenameRegex = /filename=(?:"([^"]+)"|([^;]+))/;
// Content-Disposition name regex: "name=xxx"
const ContentDispositionNameRegex = /[^e]name=(?:"([^"]+)"|([^;]+))/;
// Filename regex
const FilenameRegex = /^(?:^.*)?\.([a-z0-9_-]+)$/i;
// Multipart Content-Type regex: "multipart/formdata; boundary=xxx"
const MultipartRegex = /^multipart\/form-data; boundary=(?:"([^"]+)"|([^;]+))$/;

/**
 * Handle multipart pomf-compatible uploads.
 */
module.exports = (req, res) => {
  let files = [];

  // Check the Content-Length header
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > (config.maxFilesize * config.maxFilesPerUpload)) {
    return res.end(413, 'Request Entity Too Large', JSON.stringify({
      success: false,
      errorcode: 413,
      description: 'Request payload too large, must be less than ' + config.maxFilesize * config.maxFilesPerUpload + ', and each individual file must be less than ' + config.maxFilesize
    }), () => req.destroy());
  }

  // Check the Content-Type header
  let contentType = MultipartRegex.exec(req.headers['content-type']);
  if (contentType === null) {
    return res.end(400, 'Bad Request', JSON.stringify({
      success: false,
      errorcode: 400,
      description: 'Invalid Content-Type header, must be "multipart/formdata; boundary=xxx"'
    }));
  }

  // Parse incoming data using BusBoy
  let d = new Dicer({
    boundary: contentType[1] || contentType[2],
    maxHeaderPairs: 50
  });
  d.on('part', p => {
    let file = {
      data: [],
      ext: null,
      filename: null,
      mime: null
    };
    p.on('header', head => {
      for (let h in head) {
        if (h === 'content-disposition') {
          let name = ContentDispositionNameRegex.exec(head[h][0]);
          if (name === null || name[1] !== 'files[]') {
            return res.end(400, 'Bad Request', JSON.stringify({
              success: false,
              errorcode: 400,
              description: 'Form field name should be files[]'
            }), () => req.destroy());
          }
          let filename = ContentDispositionFilenameRegex.exec(head[h][0]);
          if (filename !== null) {
            file.filename = filename[1];
            let ext = FilenameRegex.exec(filename[1]);
            if (ext !== null) file.ext = ext[1];
          }
        }
        if (h === 'content-type') file.mime = head[h][0];
      }
    });
    p.on('data', data => {
      file.data.push(data);
    });
    p.on('end', () => {
      if (files.length === config.maxFilesPerUpload) {
        return res.end(400, 'Bad Request', JSON.stringify({
          success: false,
          errorcode: 400,
          description: 'Too many files sent in the request, the maximum permitted is ' + config.maxFilesPerUpload
        }));
      }
      file.data = Buffer.concat(file.data);
      if (file.data.length > config.maxFilesize) {
        return res.end(413, 'Request Entity Too Large', JSON.stringify({
          success: false,
          errorcode: 413,
          description: 'Request payload too large, must be less than ' + config.maxFilesize * config.maxFilesPerUpload + ', and each individual file must be less than ' + config.maxFilesize
        }), () => req.destroy());
      }
      files.push(file);
    });
  }).on('error', err => {
    console.error('Dicer error:');
    console.error(err);
    return res.end(500, 'Internal Server Error', JSON.stringify({
      success: false,
      errorcode: 500,
      description: 'Internal server error'
    }));
  }).on('finish', () => {
    if (res._headersSent || res.finished) return;
    if (files.length === 0) {
      return res.end(400, 'Bad Request', JSON.stringify({
        success: false,
        errorcode: 400,
        description: 'No input file(s)'
      }));
    }

    // Submit batch upload
    batchUpload(files).then(data => {
      if (data.length === 0) {
        // This should've been caught above, this is a server error
        console.error('batchUpload returned 0-length array.');
        return res.end(500, 'Internal Server Error', JSON.stringify({
          success: false,
          errorcode: 500,
          description: 'Internal server error'
        }));
      }
      if (data.length === 1 && data[0].error) {
        return res.end(data[0].errorcode, 'Internal server error', JSON.stringify({
          success: false,
          errorcode: data[0].errorcode,
          description: data[0].description
        }));
      }

      // Send success response
      res.end(200, 'OK', JSON.stringify({
        success: true,
        files: data
      }));
    }).catch(err => {
      console.error('Failed to batch upload:');
      console.error(err);
      res.end(500, 'Internal Server Error', JSON.stringify({
        success: false,
        errorcode: 500,
        description: 'Internal server error'
      }));
    });
  });

  // Pipe request into Dicer
  req.pipe(d);
};

/**
 * Generate file key.
 */
function generateFileKey (ext) {
  let seed = String(Math.floor(Math.random() * 10) + Date.now());
  return crypto.createHash('md5').update(seed).digest('hex').substr(2, 6) + '.' + ext;
}

/**
 * Batch upload to S3 and return an array of metadata about each object.
 * @param {object[]} files File definitions
 * @return {Promise<object[]>} Output metadata
 */
function batchUpload (files) {
  return new Promise((resolve, reject) => {
    let completed = [];

    /**
     * Push data to completed and try to resolve the promise.
     * @param {object} data
     */
    function push (data) {
      completed.push(data);
      if (completed.length === files.length) resolve(completed);
    }

    // Iterate through all files and upload them
    files.forEach(file => {
      let type = fileType(file.data);
      if (type === null || type.mime === 'text/plain') {
        if (config.textPlainExtensions.indexOf(file.ext) > -1) {
          type = { ext: file.ext, mime: 'text/plain' };
        } else {
          return push({
            error: true,
            name: file.filename,
            errorcode: 400,
            description: 'Mimetype did not match, and extension is not in text/plain whitelist'
          });
        }
      } else if (file.mime.indexOf(type.mime) !== 0) {
        return push({
          error: true,
          name: file.filename,
          errorcode: 400,
          description: 'Supplied mimetype did not match magic number mimetype'
        });
      }
      if (config.allowedFileTypes.indexOf(type.mime) === -1) {
        return push({
          error: true,
          name: file.filename,
          errorcode: 415,
          description: 'Mimetype not in whitelist'
        });
      }

      // Upload
      let key = generateFileKey(type.ext);
      putObject(key, file.data, type.mime).then(() => {
        push({
          hash: crypto.createHash('sha1').update(file.data).digest('hex'),
          name: file.filename,
          url: key,
          size: file.data.length
        });
      }).catch(err => {
        console.error('Failed to upload file to S3:');
        console.error(err);
        push({
          error: true,
          name: file.filename,
          errorcode: 500,
          description: 'Internal server error'
        });
      });
    });
  });
}

/**
 * Upload a file to S3.
 * @param {string} key
 * @param {Buffer} data
 * @param {string} type Mime type
 * @return {Promise}
 */
function putObject (key, data, type) {
  return new Promise((resolve, reject) => {
    S3.putObject({
      Bucket: process.env.SERVICE + '-filestore-' + process.env.STAGE + '-1',
      Key: key,
      Body: data,
      ContentType: type,
      StorageClass: 'REDUCED_REDUNDANCY'
    }, (err, data) => {
      if (err) return reject(err);
      resolve();
    });
  });
}
