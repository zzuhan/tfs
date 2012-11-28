/*!
 * tfs - lib/command.js
 * Copyright(c) 2012 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var util = require('util');

function Command(client, args) {
  this._args = args || {};
  this._client = client;
}

Command.prototype.__defineGetter__('url', function () {
  return this._getURL();
});

Command.prototype.__defineGetter__('args', function () {
  var args = this._getArgs() || {};
  args.timeout = this._args.timeout;
  return args;
});

function CreateFileCommand(client, args) {
  CreateFileCommand.super_.call(this, client, args);
}
util.inherits(CreateFileCommand, Command);

CreateFileCommand.prototype._getURL = function () {
  return '/v2/' + this._client.appkey + '/' + this._client.appid + '/' +
    this._args.uid + '/file/' + this._args.filename + '?recursive=1';
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
  var url = '/v2/' + this._client.appkey + '/' + this._client.appid + '/' +
    this._args.uid + '/file/' + this._args.filename;
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

exports.CreateFileCommand = CreateFileCommand;
exports.UploadFileCommand = UploadFileCommand;
