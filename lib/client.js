/*!
 * tfs - lib/client.js
 * Copyright(c) 2012 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var debug = require('debug')('tfs');
var path = require('path');
var fs = require('fs');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var urllib = require('urllib');
var eventproxy = require('eventproxy');
var command = require('./command');

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
function Client(options) {
  options = options || {};
  // http://baike.corp.taobao.com/index.php/CS_RD/tfs/http_server
  // apache服务器配置的应用路径，一般用于区分应用。如果你不需要自己独立的路径来区别，可以用默认的 "tfscom"
  this.appLocation = options.appLocation || 'tfscom';
  this.appkey = options.appkey;
  if (!this.appkey) {
    throw new TypeError('missing appkey');
  }

  this.rootServer = options.rootServer || 'restful-store.vip.tbsite.net:3800';
  var pair = this.rootServer.split(':');
  this.rootServerHost = pair[0];
  this.rootServerPort = pair[1] || 80;
  this.imageServers = options.imageServers || [
    'img1.tbcdn.cn',
    'img2.tbcdn.cn',
    'img3.tbcdn.cn',
    'img4.tbcdn.cn',
  ];
  this.imageServersIndex = 0;
  this.uploadTimeout = options.uploadTimeout || 60000;
  this.servers = [];
  this.serverIndex = 0;
  this.refreshCounter = 0;
  this.queue = [];
  this._init();
}

util.inherits(Client, EventEmitter);

Client.prototype._init = function () {
  var that = this;
  that._initTimer = setInterval(that.refreshServers.bind(that), 1000);

  that.once('servers', function () {
    // 初始化完成
    clearInterval(that._initTimer);
    that._initTimer = null;

    // get appid
    that.getAppid(function (err, appid) {
      if (err) {
        // TODO: user how to handle error?
        return that.emit('error', err);
      }
      that.appid = appid;

      // 处理队列
      for (var i = 0; i < that.queue.length; i++) {
        var task = that.queue[i];
        that._request.apply(that, task);
      }
      that.queue = [];
      that.emit('ready');
    });
  });
};

var SERVER_HOST_RE = /^\d+\.\d+\.\d+\.\d+/;

Client.prototype.refreshServers = function () {
  var that = this;
  if (that._freshing) {
    return;
  }
  that._freshing = true;
  var options = {
    host: this.rootServerHost,
    port: this.rootServerPort,
    path: '/tfs.list'
  };
  debug('GET /tfs.list');
  urllib.request(options, { timeout: 10000 }, function (err, data, res) {
    var status = res && res.statusCode;
    debug('GET /tfs.list %s', status);
    that._freshing = false;
    if (err) {
      err.url = options.path;
      return that.emit('refreshError', err);
    }

    if (status !== 200) {
      err = new Error('Http Response ' + res.statusCode);
      err.url = options.path;
      err.data = data && data.toString();
      return that.emit('refreshError', err);
    }

    if (data) {
      data = data.toString().trim();
    }

    var lines = data && data.split('\n') || [];
    if (lines.length < 2) {
      return;
    }

    // 应答内容如下，第一行为客户端下次从Webservice Root Server刷新TfsAgent Server的请求间隔，
    // 客户端发送的请求个数达到此数即应该重新从Webservice Root Server获取最新列表，
    // 其下按行存放了所有TfsAgent Server的地址：

    // 50
    // 10.232.4.41:3900
    // 10.232.4.42:3900
    // 10.232.4.43:3900
    var counter = parseInt(lines[0], 10) || 10;
    var servers = [];
    for (var i = 1; i < lines.length; i++) {
      var server = lines[i];
      if (!SERVER_HOST_RE.test(server)) {
        continue;
      }
      servers.push(server.split(':'));
    }
    if (servers.length === 0) {
      return;
    }

    that.refreshCounter = counter;
    that.serverIndex = 0;
    that.servers = servers;
    that.emit('servers', servers);
  });
};

Client.prototype._request = function (cmd, callback) {
  var that = this;
  if (that.servers.length === 0) {
    // add to queue
    return that.queue.push([ cmd, callback ]);
  }

  var server = that.servers[that.serverIndex++];
  if (that.serverIndex >= that.servers.length) {
    that.serverIndex = 0;
  }

  var pathname = cmd.url;
  var args = cmd.args || {};

  var options = {
    host: server[0],
    port: server[1],
    path: pathname,
  };
  args.timeout = args.timeout || that.uploadTimeout;

  debug('%s %s on %j, timeout %s', args.type, pathname, server, args.timeout);
  urllib.request(options, args, function (err, data, res) {
    var status = res && res.statusCode;
    var headers = res && res.headers;

    if (!err) {
      // success
      if (status === 200 || status === 201 || (cmd.ignoreStatus && status === cmd.ignoreStatus)) {
        debug('%s %j', status, headers);
        return callback(null, data);
      }

      // http non 200 error
      err = new Error('TFS request error, Http status ' + status);
      err.name = 'TFSRequestError';
    }
    
    err.status = status;
    err.headers = headers;
    err.url = server.join(':') + pathname;
    if (data) {
      if (Buffer.isBuffer(data)) {
        if (data.length > 1024) {
          data = data.slice(0, 1024);
        }
        data = data.toString();
      }
    }
    err.data = data;
    debug('%s %s: %s %s', args.type, pathname, status, err.message);
    callback(err);
  });

  // 判断是否重新获取 server 列表
  that.refreshCounter--;
  if (that.refreshCounter <= 0) {
    that.refreshServers();
  }
};

Client.prototype.getURL = function (pathname) {
  var imgServer = this.imageServers[this.imageServersIndex++];
  if (this.imageServersIndex >= this.imageServers.length) {
    this.imageServersIndex = 0;
  }
  return 'http://' + imgServer + '/' + pathname;
};

Client.prototype.getAppid = function (callback) {
  var pathname = '/v2/' + this.appkey + '/appid';
  var args = {
    type: 'GET',
    dataType: 'json'
  };
  this._request({ url: pathname, args: args }, function (err, info) {
    if (err) {
      return callback(err);
    }
    var appid = info && info.APP_ID;
    if (!appid) {
      err = new Error('GET ' + pathname + ' return appid is empty');
      err.name = 'TFSRequestError';
      return callback(err);
    }
    debug('appid: %s', appid);
    callback(null, appid);
  });
};

Client.prototype.createCommand = function (name, args) {
  var cmd = new command[name + 'Command'](this, args);
  cmd.__name = name;
  return cmd;
};

/**
 * v1
 */

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
Client.prototype.upload = function (filepath, callback, timeout) {
  var that = this;
  fs.readFile(filepath, function (err, buffer) {
    if (err) {
      return callback(err);
    }

    var args = {
      filepath: filepath,
      timeout: timeout,
      content: buffer,
    };

    var cmd = that.createCommand('Upload', args);

    var size = buffer.length;
    debug('upload %d %s', size, filepath);
    that._request(cmd, function (err, data) {
      if (err) {
        return callback(err);
      }
      var name = data && data.TFS_FILE_NAME;
      if (!name) {
        // error
        err = new Error('TFS upload error');
        err.name = 'TFSUploadError';
        err.data = data;
        return callback(err);
      }

      var info = {
        name: name,
        size: size,
        url: that.getURL(that.appLocation + '/' + name)
      };
      debug('%j', info);
      callback(null, info);
    });
  });
};

Client.prototype.remove = function (name, options, callback, timeout) {
  if (typeof options === 'function') {
    timeout = callback;
    callback = options;
    options = null;
  }
  var args = {
    name: name,
    timeout: timeout,
  };
  if (options && typeof options.hide === 'number') {
    args.hide = String(options.hide);
  }

  var cmd = this.createCommand('Remove', args);
  this._request(cmd, function (err, data) {
    if (err) {
      return callback(err);
    }
    callback(null, true);
  });
};

Client.prototype.download = function (name, savefile, options, callback, timeout) {
  if (typeof options === 'function') {
    timeout = callback;
    callback = options;
    options = null;
  }
  var writeStream = savefile;
  if (typeof savefile === 'string') {
    writeStream = fs.createWriteStream(savefile);
  }
  var args = {
    name: name,
    timeout: timeout,
    writeStream: writeStream,
  };
  if (options) {
    args.offset = options.offset;
    args.size = options.size;
  }
  var cmd = this.createCommand('Download', args);
  this._request(cmd, function (err) {
    if (err) {
      return callback(err);
    }
    callback(null, true);
  });
};

/**
 * v2
 */

/**
 * Create a file.
 * @param {String} uid, user id
 * @param {[type]} filename, e.g.: 'foo/bar.jpg', 'foo.png'.
 * @param {Function(err, success)} callback
 * @param {Number} [timeout], request timeout
 */
Client.prototype.createFile = function (uid, filename, callback, timeout) {
  var cmd = this.createCommand('CreateFile', {
    uid: uid,
    filename: filename,
    timeout: timeout
  });
  this._request(cmd, function (err, buffer) {
    if (err) {
      return callback(err);
    }
    callback(null, true);
  });
};

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
Client.prototype.uploadFile = function (filepath, uid, filename, options, callback, timeout) {
  if (typeof options === 'function') {
    timeout = callback;
    callback = options;
    options = null;
  }

  var that = this;
  var ep = eventproxy.create('content', 'createFile', function (content, success) {
    var args = {
      uid: uid,
      content: content,
      filename: filename,
      timeout: timeout
    };

    if (options && options.offset) {
      args.offset = options.offset;
    }

    var cmd = that.createCommand('UploadFile', args);

    that._request(cmd, ep.done(function () {
      // http://image_host:port/L1/appid/userid/file_path
      // http://baike.corp.taobao.com/index.php/CS_RD/tfs/http_server
      var name = 'L1/' + that.appid + '/' + uid + '/' + filename;
      var info = {
        name: name,
        url: that.getURL(name),
        size: content.length
      };
      callback(null, info);
    }));
  });

  ep.fail(callback);

  fs.readFile(filepath, ep.done('content'));
  that.createFile(uid, filename, ep.done('createFile'), timeout);
};

/**
 * Remove a custom name file.
 * 
 * @param {String} uid
 * @param {String} filename
 * @param {Function(err, success)} callback
 * @param {Number} [timeout]
 */
Client.prototype.removeFile = function (uid, filename, callback, timeout) {
  var cmd = this.createCommand('RemoveFile', {
    uid: uid,
    filename: filename
  });

  this._request(cmd, function (err) {
    if (err) {
      return callback(err);
    }
    callback(null, true);
  });
};

exports.Client = Client;

exports.createClient = function (options) {
  return new Client(options);
};