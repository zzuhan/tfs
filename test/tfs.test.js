/*!
 * tfs - test/tfs.test.js
 * Copyright(c) 2012 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var path = require('path');
var tfs = require('../');
var should = require('should');


describe('tfs.test.js', function () {

  var client = tfs.createClient({
    appname: 'tfscom',
    appkey: 'tfscom',
    rootServer: '10.232.4.44:3800',
    imageServers: [
      'img01.daily.taobaocdn.net',
      'img02.daily.taobaocdn.net',
      'img03.daily.taobaocdn.net',
      'img04.daily.taobaocdn.net',
    ],
  });

  afterEach(function () {
    client.removeAllListeners();
  });
  
  describe('refreshServers()', function () {
    it('should get servers list from rootServer', function (done) {
      client.once('servers', function (servers) {
        client.refreshCounter.should.equal(100);
        servers.length.should.above(0);
        done();
      });
      client.once('refreshError', function (err) {
        throw err;
      });

      client.refreshServers();
    });
  });

  describe.only('upload()', function () {
    var logopath = path.join(path.dirname(__dirname), 'logo.png');

    it('should upload logo.png to tfs', function (done) {
      client.upload(logopath, function (err, info) {
        should.not.exist(err);
        info.should.have.keys('name', 'url', 'size');
        info.size.should.be.a('number');
        info.name.should.be.a('string').with.match(/\.png$/);
        info.url.should.be.a('string').with.match(/\.png$/);
        done();
      });
    });
    
  });
});