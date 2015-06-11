'use strict';

var fs = require('fs');

exports._chain = chain;
exports._lineMaker = _lineMaker;
exports._lineNumberStapler = _lineNumberStapler;
exports._fileWriter = _fileWriter;
exports.lineNumberAggregate = lineNumberAggregate;

function chain() {
  var target;
  [].slice.call(arguments).reverse().forEach(function (values, index) {
    var generatorFunc = values.shift();
    if (index === 0) {
      target = generatorFunc.apply(null, values);
    } else {
      values.unshift(target);
      target = generatorFunc.apply(null, values);
    }
    target.next();
  });
  return target;
}

function* _lineMaker(target) {
  var previous = '';
  while (true) {
    try {
      var data = yield;
      var lines = data.split('\n');
      lines[0] += previous;
      previous = lines.pop();
      lines.forEach(function (line) {
        target.next(line + '\n');
      });
    } catch (e) {
      if (previous !== '') {
        target.next(previous + '\n');
      }
      target.throw();
    }
  }
}

function* _lineNumberStapler(target) {
  var counter = 1;
  while (true) {
    try {
      target.next(counter++ + ' ' + (yield));
    } catch (e) {
      target.throw();
    }
  }
}

function* _fileWriter(path, done) {
  var data = '';
  try {
    while (true) {
      data += yield;
    }
  } catch (e) {
    fs.writeFile(path, data, done);
  }
}

function lineNumberAggregate(src, dst, done) {
  var maker = chain([_lineMaker], [_lineNumberStapler], [_fileWriter, dst, done]);
  var stream = fs.createReadStream(src, { encoding: 'utf8' });
  stream.on('data', function (data) {
    maker.next(data);
  });
  stream.on('end', function () {
    maker.throw();
  });
  stream.on('error', function (err) {
    done(err);
  });
}
