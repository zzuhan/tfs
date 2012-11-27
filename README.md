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

## Usage

```js
var tfs = require('tfs');

var client = tfs.createClient({
  rootServer: 'restful-store.vip.tbsite.net:3800',
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