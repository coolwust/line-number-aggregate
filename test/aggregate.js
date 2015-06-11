'use strict';

var aggregate = require('../lib/aggregate.js');
var _chain = aggregate._chain;
var _lineMaker = aggregate._lineMaker;
var _lineNumberStapler = aggregate._lineNumberStapler;
var _fileWriter = aggregate._fileWriter;
var lineNumberAggregate = aggregate.lineNumberAggregate;
var expect = require('chai').expect;
var fs = require('fs');
var child_process = require('child_process');

describe('_chain', function () {
  it('chain all the generator functions', function () {

    var word;

    function* a(target) {
      target.next(yield);
    }

    function* b(target) {
      target.next(yield);
    }

    function* c(input) {
      word = input + ' ' + (yield);
    }

    var generatorObj = _chain([a], [b], [c, 'hello']);
    var result = generatorObj.next('world');
    expect(word).to.equal('hello world');
  });
});

describe('_lineMaker', function () {
  it('make line from the file contents', function (done) {

    var counter = 0;
    function* lineConsumer() {
      while (true) {
        try {
          yield;
          counter++;
        } catch (e) { }
      }
    }

    var consumer = lineConsumer();
    consumer.next();
    var maker = _lineMaker(consumer);
    maker.next();
    var stream = fs.createReadStream(__dirname + 
      '/fixtures/draft-ietf-httpbis-http2-17.txt');
    stream.on('data', function onData(data) {
      maker.next(data.toString('utf8'));
    });
    stream.on('end', function onEnd() {
      maker.throw();
      expect(counter).to.equal(5152);
      done();
    });
  });
});

describe('_lineNumberStapler', function () {
  it('staple line number', function () {
    
    var line;
    function* lineConsumer() {
      while (true) {
        line = yield
      }
    }

    var consumer = lineConsumer();
    consumer.next();
    var stapler = _lineNumberStapler(consumer);
    stapler.next();
    stapler.next('hello world\n');
    stapler.next('hello asia\n');
    expect(line).to.equal('2 hello asia\n');
  });
});

describe('_fileWriter', function () {
  afterEach(function (done) {
    child_process.exec('rm ' + __dirname + '/fixtures/filewrite', done);
  });
  it('write file', function (done) {
    var write = _fileWriter(__dirname + '/fixtures/filewrite', function () {
      fs.readFile(__dirname + '/fixtures/filewrite', function (err, data) {
        expect(data.toString()).to.equal('hello world');
        done();
      });
    });
    write.next();
    write.next('hello world');
    write.throw();
  });
});

describe('lineNumberAggregate', function () {
  it('add line number to a file', function (done) {
    var src = __dirname + '/fixtures/draft-ietf-httpbis-http2-17.txt';
    var dst = __dirname + '/fixtures/linenumberaggregate';
    lineNumberAggregate(src, dst, function () {
        child_process.exec('tail -n -1 ' + dst, function (err, stdout) {
          expect(stdout).to.equal('5152 Belshe, et al.           Expires ' +
            'August 15, 2015               [Page 92]\n');
          done();
        });
      });
  });
});
