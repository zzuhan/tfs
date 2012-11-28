/*!
 * tfs - demo/buyerstory.js
 * Copyright(c) 2012 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var path = require('path');
var tfs = require('../');

var client = tfs.createClient({
  appkey: 'tfscom',
  rootServer: '10.232.4.44:3800',
  imageServers: [ 'img01.daily.taobaocdn.net' ],
});

client.on('servers', function (servers) {
  console.log(servers);
});

var logopath = path.join(path.dirname(__dirname), 'logo.png');

client.uploadFile(logopath, '320', 'tfs.png', function (err, info) {
  console.log(info);
});