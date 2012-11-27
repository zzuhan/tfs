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


describe('tfs.test.js', function () {

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

    var logopath = path.join(path.dirname(__dirname), 'logo.png');

    it('should upload logo.png to tfs', function (done) {
      client.upload(logopath, function (err, info) {
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
        err.message.should.equal('TFS upload error, Http status 200');
        err.name.should.equal('TFSUploadError');
        should.not.exist(info);
        done();
      });
    });

    it('should upload timeout', function (done) {
      mm.http.request(/\/v1\/tfscom/, new Buffer('{}'), {}, 1000000);
      client.upload(logopath, 500, function (err, info) {
        should.exist(err);
        err.message.should.equal('Request timeout for 500ms.');
        should.not.exist(info);
        done();
      });
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
        client.refreshCounter.should.equal(100);
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

});