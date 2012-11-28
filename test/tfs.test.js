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
var mm = require('mm');
var pedding = require('pedding');


describe('tfs.test.js', function () {

  var tfsClient = tfs.createClient({
    appkey: 'tfscom',
    rootServer: '10.232.4.44:3800',
    imageServers: [
      'img01.daily.taobaocdn.net',
      'img02.daily.taobaocdn.net',
    ],
  });

  var logopath = path.join(path.dirname(__dirname), 'logo.png');

  afterEach(function () {
    mm.restore();
  });

  it('should throw missing appkey error', function () {
    (function () {
      tfs.createClient();
    }).should.throw('missing appkey');
  });

  describe('upload()', function () {
    var client = tfs.createClient({
      appkey: 'tfscom',
      rootServer: '10.232.4.44:3800',
      imageServers: [
        'img01.daily.taobaocdn.net',
        'img02.daily.taobaocdn.net',
      ],
    });

    it('should upload logo.png to tfs', function (done) {
      client.upload(logopath, function (err, info) {
        client.appid.should.equal('1');
        should.not.exist(err);
        info.should.have.keys('name', 'url', 'size');
        info.size.should.be.a('number');
        info.name.should.be.a('string').with.match(/\.png$/);
        info.url.should.be.a('string').with.match(/\.png$/);
        info.url.should.include('http://img01.daily.taobaocdn.net/tfscom/');

        client.refreshCounter = 1;
        // next upload will refresh servers
        client.upload(logopath, function (err, info) {
          should.not.exist(err);
          info.should.have.keys('name', 'url', 'size');
          info.size.should.be.a('number');
          info.name.should.be.a('string').with.match(/\.png$/);
          info.url.should.be.a('string').with.match(/\.png$/);
          info.url.should.include('http://img02.daily.taobaocdn.net/tfscom/');

          client.upload(logopath, function (err, info) {
            should.not.exist(err);
            info.should.have.keys('name', 'url', 'size');
            info.size.should.be.a('number');
            info.name.should.be.a('string').with.match(/\.png$/);
            info.url.should.be.a('string').with.match(/\.png$/);
            info.url.should.include('http://img01.daily.taobaocdn.net/tfscom/');
            done();
          });
        });
      });
    });

    it('should upload error', function (done) {
      mm.http.requestError(/\/v1\/tfscom/, 'mock request() error');
      client.upload(logopath, function (err, info) {
        should.exist(err);
        err.message.should.equal('mock request() error');
        should.not.exist(info);
        done();
      });
    });

    it('should upload 500 error', function (done) {
      mm.http.request(/\/v1\/tfscom/, new Buffer(''), {});
      client.upload(logopath, function (err, info) {
        should.exist(err);
        err.message.should.equal('Unexpected end of input');
        should.not.exist(info);
        done();
      });
    });

    it('should upload error when file not exists', function (done) {
      mm.http.request(/\/v1\/tfscom/, new Buffer(''), {});
      client.upload(logopath + 'not-exists', function (err, info) {
        should.exist(err);
        err.message.should.include('ENOENT');
        should.not.exist(info);
        done();
      });
    });

    it('should upload return wrong response', function (done) {
      mm.http.request(/\/v1\/tfscom/, new Buffer('{}'), {});
      client.upload(logopath, function (err, info) {
        should.exist(err);
        err.message.should.equal('TFS upload error');
        err.name.should.equal('TFSUploadError');
        should.not.exist(info);
        done();
      });
    });

    it('should upload timeout', function (done) {
      mm.http.request(/\/v1\/tfscom/, new Buffer('{}'), {}, 1000000);
      client.upload(logopath, function (err, info) {
        should.exist(err);
        err.message.should.equal('Request timeout for 500ms.');
        should.not.exist(info);
        done();
      }, 500);
    });
    
  });

  describe('refreshServers()', function () {

    var client;

    before(function () {
      client = tfs.createClient({
        appkey: 'tfscom',
        rootServer: '10.232.4.44:3800'
      });
    });

    it('should get servers list from rootServer', function (done) {
      client.once('servers', function (servers) {
        client.refreshCounter.should.equal(99); // getAppid()
        servers.length.should.above(0);
        client.removeAllListeners();
        done();
      });
      client.once('refreshError', function (err) {
        throw err;
      });

      client.refreshServers();
      client.refreshServers(); // no problem
    });

    it('should emit refreshError', function (done) {
      mm.http.requestError('/tfs.list', 'mock request() error');

      client.once('servers', function (servers) {
        throw new Error('should not emit this event');
      });
      client.once('refreshError', function (err) {
        should.exist(err);
        err.message.should.equal('mock request() error');
        done();
      });

      client.refreshServers();
    });

    it('should emit refreshError when statusCode !== 200', function (done) {
      mm.http.request('/tfs.list', '', { statusCode: 404 });

      client.once('servers', function (servers) {
        throw new Error('should not emit this event');
      });
      client.once('refreshError', function (err) {
        should.exist(err);
        err.message.should.equal('Http Response 404');
        done();
      });

      client.refreshServers();
    });

    it('should not emit any events when rootServer return empty datas', function (done) {
      mm.http.request('/tfs.list', '');
      client.once('servers', function (servers) {
        throw new Error('should not emit servers');
      });
      client.once('refreshError', function (err) {
        throw err;
      });
      client.refreshServers();
      setTimeout(done, 500);
    });

    it('should not emit any events when rootServer return wrong datas', function (done) {
      mm.http.request('/tfs.list', 'foo\nbar\n1\n\n2\n3\n12312312');
      client.once('servers', function (servers) {
        throw new Error('should not emit servers');
      });
      client.once('refreshError', function (err) {
        throw err;
      });
      client.refreshServers();
      setTimeout(done, 500);
    });

  });

  it('should emit ready event', function (done) {
    done = pedding(2, done);
    
    var c = tfs.createClient({
      appkey: 'tfscom',
      rootServer: '10.232.4.44:3800',
      imageServers: [
        'img01.daily.taobaocdn.net',
        'img02.daily.taobaocdn.net',
      ],
    });
    c.on('ready', function () {
      should.ok(c.appid);
      done();
    });
    // check queue
    c.uploadFile(logopath, 320, 'logo.png', function (err, info) {
      should.not.exist(err);
      info.should.have.keys('url', 'name', 'size');
      info.name.should.equal('L1/1/320/logo.png');
      info.url.should.include('http://');
      info.url.should.include('L1/1/320/logo.png');
      done();
    });
  });

  describe('createFile()', function () {

    it('should create 320/foobar.png', function (done) {
      done = pedding(2, done);

      tfsClient.createFile(320, 'foobar.png', function (err, success) {
        should.not.exist(err);
        should.ok(success);
        done();
      });

      tfsClient.createFile('320', 'foobar.png', function (err, success) {
        should.not.exist(err);
        should.ok(success);
        done();
      });
    });

    it('should return error when uid wrong', function (done) {
      tfsClient.createFile('wrongid', 'foobar.png', function (err, success) {
        should.exist(err);
        err.name.should.equal('TFSRequestError');
        err.message.should.equal('TFS request error, Http status 400');
        err.data.should.include('400 Bad Request');
        done();
      });
    });

  });

  describe('uploadFile()', function () {

    it('should uploadFile 320/logo.png', function (done) {
      tfsClient.uploadFile(logopath, 320, 'logo.png', function (err, info) {
        should.not.exist(err);
        info.should.have.keys('url', 'name', 'size');
        info.name.should.equal('L1/1/320/logo.png');
        info.url.should.include('http://');
        info.url.should.include('L1/1/320/logo.png');

        var p2 = path.join(__dirname, '1212.jpg');
        tfsClient.uploadFile(p2, 1212, 'head.jpg', function (err, info) {
          should.not.exist(err);
          info.should.have.keys('url', 'name', 'size');
          info.name.should.equal('L1/1/1212/head.jpg');
          info.url.should.include('http://');
          info.url.should.include('L1/1/1212/head.jpg');
          done();
        });
      });
    });

    it('should return error when uid wrong', function (done) {
      tfsClient.uploadFile(logopath, 'wrongid', 'logo.png', function (err, info) {
        should.exist(err);
        err.name.should.equal('TFSRequestError');
        err.message.should.equal('TFS request error, Http status 400');
        err.data.should.include('400 Bad Request');
        should.not.exist(info);
        done();
      });
    });

    it('should return error when file not exists', function (done) {
      tfsClient.uploadFile(logopath + 'not exists', 'wrongid', 'logo.png', function (err, info) {
        should.exist(err);
        err.message.should.include('ENOENT');
        should.not.exist(info);
        done();
      });
    });

  });

  describe('getAppid()', function () {
    it('should return appid', function (done) {
      tfsClient.getAppid(function (err, appid) {
        should.not.exist(err);
        appid.should.equal('1');
        done();
      });
    });

    it('should return mock error', function (done) {
      mm.http.requestError('/v2/tfscom/appid', 'get appid error');
      tfsClient.getAppid(function (err, appid) {
        should.exist(err);
        err.name.should.equal('MockHttpRequestError');
        err.message.should.equal('get appid error');
        should.not.exist(appid);
        done();
      });
    });

    it('should return mock empty response', function (done) {
      mm.http.request('/v2/tfscom/appid', '{}');
      tfsClient.getAppid(function (err, appid) {
        should.exist(err);
        err.name.should.equal('TFSRequestError');
        err.message.should.equal('GET /v2/tfscom/appid return appid is empty');
        should.not.exist(appid);
        done();
      });
    });
  });

  describe('removeFile()', function () {
    it('should remove not exists file success', function (done) {
      tfsClient.removeFile('320', 'noexists.jpg', function (err, success) {
        should.not.exist(err);
        should.ok(success);
        done();
      });
    });

    it('should return error when uid wrong', function (done) {
      tfsClient.removeFile('wronguid', 'noexists.jpg', function (err, success) {
        should.exist(err);
        err.message.should.equal('TFS request error, Http status 400')
        should.not.exist(success);
        done();
      });
    });

    it('should remove 320/logo.png', function (done) {
      tfsClient.uploadFile(logopath, 320, 'logo.png', function (err, info) {
        should.not.exist(err);
        info.should.have.keys('url', 'name', 'size');
        tfsClient.removeFile(320, 'logo.png', function (err, success) {
          should.not.exist(err);
          should.ok(success);
          done();
        });
      });
    });

  });

});