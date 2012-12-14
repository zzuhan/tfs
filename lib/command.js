/*!
 * tfs - lib/command.js
 * Copyright(c) 2012 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var path = require('path');
var util = require('util');

function Command(client, args) {
  this._args = args || {};
  this._client = client;
  this.ignoreStatus = null;
}

Command.prototype._getURL = function () {
  var url = '/v2/' + this._client.appkey + '/' + this._client.appid + '/' +
    this._args.uid + '/file/' + this._args.filename;
  return url;
};

Command.prototype.__defineGetter__('url', function () {
  return this._getURL();
});

Command.prototype.__defineGetter__('args', function () {
  var args = this._getArgs() || {};
  args.timeout = this._args.timeout;
  return args;
});

/**
 * v1: upload, remove, download, getMeta
 */

function UploadCommand(client, args) {
  UploadCommand.super_.call(this, client, args);
}
util.inherits(UploadCommand, Command);

UploadCommand.prototype._getURL = function () {
  var filepath = this._args.filepath;
  var pathname = '/v1/' + this._client.appkey;
  var extname = path.extname(filepath);
  if (extname) {
    pathname += '?suffix=' + extname + '&simple_name=1';
  }
  return pathname;
};

UploadCommand.prototype._getArgs = function () {
  return {
    type: 'POST',
    dataType: 'json',
    content: this._args.content,
  };
};

function RemoveCommand(client, args) {
  RemoveCommand.super_.call(this, client, args);
  this.ignoreStatus = 404;
}
util.inherits(RemoveCommand, Command);

RemoveCommand.prototype._getURL = function () {
  var url = '/v1/' + this._client.appkey + '/' + this._args.name;
  if (this._args.hide) {
    url += '?hide=' + this._args.hide; 
  }
  return url;
};

RemoveCommand.prototype._getArgs = function () {
  return {
    type: 'DELETE',
    headers: { 'Content-Length': 0 }
  };
};

function DownloadCommand(client, args) {
  DownloadCommand.super_.call(this, client, args);
}
util.inherits(DownloadCommand, Command);

DownloadCommand.prototype._getURL = function () {
  var url = '/v1/' + this._client.appkey + '/' + this._args.name;
  var offset = parseInt(this._args.offset, 10);
  var size = parseInt(this._args.size, 10);
  if (!isNaN(offset)) {
    url += '?offset=' + offset; 
    if (size > 0) {
      url += '&size=' + size;
    }
  }
  return url;
};

DownloadCommand.prototype._getArgs = function () {
  return {
    type: 'GET',
    writeStream: this._args.writeStream
  };
};

/**
 * v2: createFile, uploadFile, removeFile, getFile
 */

function CreateFileCommand(client, args) {
  CreateFileCommand.super_.call(this, client, args);
  this.ignoreStatus = 409; // 409 Conflict, dir exists
}
util.inherits(CreateFileCommand, Command);

CreateFileCommand.prototype._getURL = function () {
  var url = CreateFileCommand.super_.prototype._getURL.call(this);
  return url + '?recursive=1';
};

CreateFileCommand.prototype._getArgs = function () {
  return {
    type: 'POST',
    headers: { 'Content-Length': 0 }
  };
};

function UploadFileCommand(client, args) {
  UploadFileCommand.super_.call(this, client, args);
}
util.inherits(UploadFileCommand, Command);

UploadFileCommand.prototype._getURL = function () {
  var url = UploadFileCommand.super_.prototype._getURL.call(this);
  if (this._args.offset) {
    url += '?offset=' + this._args.offset + '&size=' + this._args.content.length;
  }
  return url;
};

UploadFileCommand.prototype._getArgs = function () {
  return {
    type: 'PUT',
    content: this._args.content,
  };
};

function RemoveFileCommand(client, args) {
  RemoveFileCommand.super_.call(this, client, args);
  this.ignoreStatus = 404;
}
util.inherits(RemoveFileCommand, Command);

RemoveFileCommand.prototype._getArgs = function () {
  return {
    type: 'DELETE',
    headers: { 'Content-Length': 0 }
  };
};

// v1
exports.UploadCommand = UploadCommand;
exports.RemoveCommand = RemoveCommand;
exports.DownloadCommand = DownloadCommand;

// v2
exports.CreateFileCommand = CreateFileCommand;
exports.UploadFileCommand = UploadFileCommand;
exports.RemoveFileCommand = RemoveFileCommand;
