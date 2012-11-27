/*!
 * tfs - lib/tfs.js
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

/**
 * Create TFS RESTFul client.
 * 
 * @param {Object} options
 *  - {String} appkey
 *  - {String} appname
 *  - {Number} [uploadTimeout], upload max timeout, default is 60s.
 *  - {String} [rootServer], 'host:port' format, default is 'restful-store.vip.tbsite.net:3800'.
 *  - {Array} [imageServers], default is CDN online servers list.
 * @return {Client}
 */
function Client(options) {
  options = options || {};
  this.appname = options.appname;
  this.appkey = options.appkey;
  if (!this.appkey) {
    throw new TypeError('missing appkey or appname');
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
  this._initTimer = setInterval(this.refreshServers.bind(this), 1000);

  this.once('servers', function () {
    // 初始化完成
    clearInterval(this._initTimer);
    this._initTimer = null;

    // 处理队列
    for (var i = 0; i < this.queue.length; i++) {
      var task = this.queue[i];
      this.upload.apply(this, task);
    }
    this.queue = [];
  }.bind(this));
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
  urllib.request(options, { timeout: 10000 }, function (err, data, res) {
    that._freshing = false;
    if (err) {
      return that.emit('refreshError', err);
    }

    if (res && res.statusCode !== 200) {
      err = new Error('Http Response ' + res.statusCode);
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
    that.servers = servers;
    that.emit('servers', servers);
  });
};

Client.prototype.upload = function (filepath, timeout, callback) {
  if (typeof timeout === 'function') {
    callback = timeout;
    timeout = null;
  }
  if (this.servers.length === 0) {
    // add to queue
    return this.queue.push([ filepath, timeout, callback ]);
  }

  timeout = timeout || this.uploadTimeout;
  var that = this;
  fs.readFile(filepath, function (err, buffer) {
    if (err) {
      return callback(err);
    }
    var server = that.servers[that.serverIndex++];
    if (that.serverIndex >= that.servers.length) {
      that.serverIndex = 0;
    }

    var pathname = '/v1/' + that.appkey;
    var extname = path.extname(filepath);
    if (extname) {
      pathname += '?suffix=' + extname + '&simple_name=1';
    }

    var options = {
      host: server[0],
      port: server[1],
      path: pathname,
    };
    var args = {
      type: 'POST',
      dataType: 'json',
      content: buffer,
      timeout: timeout,
    };
    var size = buffer.length;
    debug('%j, size: %d', options, size);
    urllib.request(options, args, function (err, data, res) {
      if (err) {
        err.data = data && data.toString();
        err.status = res && res.statusCode;
        err.headers = res && res.headers;
        // TODO: remove error server
        // that.servers.splice(that.serverIndex, 1);
        return callback(err);
      }
      var name = data && data.TFS_FILE_NAME;
      if (!name) {
        // error
        err = new Error('TFS upload error, Http status ' + (res && res.statusCode));
        err.name = 'TFSUploadError';
        err.data = data;
        return callback(err);
      }

      var imgServer = that.imageServers[that.imageServersIndex++];
      if (that.imageServersIndex >= that.imageServers.length) {
        that.imageServersIndex = 0;
      }
      var info = {
        name: name,
        size: size,
        url: 'http://' + imgServer + '/' + that.appname + '/' + name
      };
      debug('%j', info);
      callback(null, info);
    });

    // 判断是否重新获取 server 列表
    that.refreshCounter--;
    if (that.refreshCounter <= 0) {
      that.refreshServers();
    }
  });
};

exports.Client = Client;

exports.createClient = function (options) {
  return new Client(options);
};