tfs
=======

![logo](https://raw.github.com/fengmk2/tfs/master/logo.png)

[TFS: Taobao FileSystem](http://code.taobao.org/p/tfs/src/) nodejs client.

* jscoverage: [98%](http://fengmk2.github.com/coverage/tfs.html)

## Install

```bash
$ npm install tfs
```

## Usage

```js
var tfs = require('tfs');

var client = tfs.createClient({
  rootServer: '$host:port',
  appkey: '$your_appkey',
});

// upload normal file
client.upload(filepath, function (err, info) {
  console.log(info);
  // { 
  //   filename: 'T2xRETBgZv1RCvBVdK.jpg', 
  //   url: 'http://img1.tfs.com/tfscom/T2xRETBgZv1RCvBVdK.jpg',
  //   size: 1024
  // }
});

// upload custom name file
client.uploadFile(filepath, '320', 'foo.jpg', function (err, info) {
  console.log(info);
  // { 
  //   filename: 'L1/1/320/foo.jpg',
  //   url: 'http://img1.tfs.com/L1/1/320/foo.jpg',
  //   size: 1984
  // }
});
```

## API

```js
/**
 * Create TFS RESTFul client.
 * 
 * @param {Object} options
 *  - {String} appkey
 *  - {String} [appLocation], default is 'tfscom'.
 *  - {Number} [uploadTimeout], upload max timeout, default is 60s.
 *  - {String} [rootServer], 'host:port' format, default is 'restful-store.vip.tbsite.net:3800'.
 *  - {Array} [imageServers], default is CDN online servers list.
 * @return {Client}
 */
function createClient(options);

/**
 * Upload a file.

 * @param {String} filepath
 * @param {Function(err, info)} callback
 *  - {Object} info
 *   - {String} name, tfs file name
 *   - {String} url, CDN url
 *   - {Number} size, file size
 * @param {Number} timeout, default is `client.uploadTimeout`.
 */
Client.prototype.upload = function (filename, callback, timeout);

/**
 * Upload a file with custom filename.
 * 
 * @param {String} filepath
 * @param {String} uid, user id
 * @param {String} filename
 * @param {Object} [options]
 *  - {Number} offset
 * @param {Function(err, info)} callback
 * @param {Number} [timeout]
 */
Client.prototype.uploadFile = function (filepath, uid, filename, options, callback, timeout);

/**
 * Remove a custom name file.
 * 
 * @param {String} uid
 * @param {String} filename
 * @param {Function(err, success)} callback
 * @param {Number} [timeout]
 */
Client.prototype.removeFile = function (uid, filename, callback, timeout);
```

## Authors

```bash
$ git summary 

 project  : node-tfs
 repo age : 2 hours
 active   : 2 days
 commits  : 6
 files    : 12
 authors  : 
     6  苏千                  100.0%
```