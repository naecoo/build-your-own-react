const path = require('path');
const resolve = (dir) => path.resolve(__dirname, dir);

module.exports = {
	input: resolve('./src/index.js'),
  output: {
    file: resolve('./dist/index.js'),
    format: 'umd',
    name: 'Didact'
  }
};
