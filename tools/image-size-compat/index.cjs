// Metro 0.81 expects a callable CommonJS export. image-size 2 fixes unsafe
// parsers but exports named functions. Keep Metro's buffer-based API intact.
const modern = require('image-size-patched');
const fs = require('node:fs');
function imageSize(input, callback) {
  if (typeof callback === 'function') {
    if (typeof input === 'string') return fs.readFile(input, (error, data) => {
      if (error) return callback(error);
      try { callback(null, modern.imageSize(data)); } catch (failure) { callback(failure); }
    });
    try { callback(null, modern.imageSize(input)); } catch (error) { callback(error); }
    return;
  }
  return modern.imageSize(typeof input === 'string' ? fs.readFileSync(input) : input);
}
module.exports = Object.assign(imageSize, modern, { default: imageSize, imageSize });
