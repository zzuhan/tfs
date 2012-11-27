tfs
=======

![logo](http://gitlab.alibaba-inc.com/node-tfs/blob/master/logo.png)

TFS 的nodejs客户端，[TFS文档](http://baike.corp.taobao.com/index.php/CS_RD/tfs_new)

* jscoverage: [100%](http://fengmk2.github.com/coverage/node-tfs.html)
* [TFS RESTful Web Service](http://baike.corp.taobao.com/index.php/CS_RD/tfs/use_web_service)

## Install

```bash
$ npm install tnpm -g
$ tnpm install tfs
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
 * @param {Number} timeout, default is `client.uploadTimeout`.
 * @param {Function(err, info)} callback
 *  - {Object} info
 *   - {String} name, tfs file name
 *   - {String} url, CDN url
 *   - {Number} size, file size
 */
Client.prototype.upload = function (filename, timeout, callback);
```

## Usage

```js
var tfs = require('tfs');

var client = tfs.createClient({
  rootServer: '$host:port',
  appkey: '$your_appkey',
});

client.upload(filepath, function (err, info) {
  console.log(info);
  // { 
  //   filename: 'T2xRETBgZv1RCvBVdK.jpg', 
  //   url: 'http://img01.tbcdn.cn/xxx/T2xRETBgZv1RCvBVdK.jpg',
  //   size: 1024
  // }
});
```

## Contact

* ![mk2](http://aita.alibaba-inc.com/avatar/4451-180-20110818155148.jpeg) [苏千](http://aita.alibaba-inc.com/043624)

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