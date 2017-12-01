'use strict'
const async = require('async');
const fs = require('fs');

const EventEmitter = require('events');
const path = require('path');

const emitter = new EventEmitter();
const isWin = /^win/.test(process.platform);
const isHiddenRegexLinux = new RegExp(/\/\./g);
const isHiddenRegexWin   = new RegExp(/\\\./g);

const hiddenRegex = (isWin) ? isHiddenRegexWin : isHiddenRegexLinux

function isHidden(item){
  return hiddenRegex.test(item);
}
const fn = function (){};

const Find = function (dir, options){
  const self = this;

  self.directory = dir;
  self.done = fn;

  self.options = options || {};

  self.hidden = (options.hidden === undefined) ? true : options.hidden;

  self.output = {
    files : [],
    directorys : [],
    errors : []
  };

  self.base = "";

  if (self.options.absolute && !path.isAbsolute(dir)){
    self.base = __dirname;
  }

  self.options.concurrency = self.options.concurrency || 10;

  self.queue = async.queue(function(location, callback) {
    async.setImmediate(function (){
      self._stat(location, callback);
    });
  }, self.options.concurrency);


  self.queue.drain = function (){
    self.done(null, self.output);
    emitter.emit('done', self.output);
  }

  return this;
}



Find.prototype.start = function (callback) {
  const self = this;

  self.onError = callback || fn;
  self.done = callback || fn;

  self.isCallback = (callback) ? true : false;
  self.dir(self.directory);
  return emitter;
};
Find.prototype.dir = function (dir, callback) {
  const self = this;

  callback = callback || fn;

  fs.readdir(dir, function (err, res){
    if (err) {
      self.output.errors.push(err);
      emitter.emit('err', err);
      return self.done(err);
    }
    async.forEachLimit(res, self.options.concurrency, function (value, next){
      const location = path.join(dir, value);
      self.queue.push(location, fn);
      async.setImmediate(next)
    }, function (){
      async.setImmediate(callback)
    });
  });
};

function matchFile(obj, options){
  const status = [];

  if (options.match){
    if (obj.path.match(options.match)){
      status.push(true);
    }else{
      status.push(false);
    }
  }

  if (options.mtime){
    status.push (compare(options.mtime.time, obj.stats.mtime, options.mtime.newer, options.mtime.exact));
  }
  if (options.ctime){
    status.push (compare(options.ctime.time, obj.stats.ctime, options.ctime.newer, options.ctime.exact));
  }
  if (options.atime){
    status.push (compare(options.atime.time, obj.stats.atime, options.atime.newer, options.atime.exact));
  }
  if (options.birthtime){
    status.push (compare(options.birthtime.time, obj.stats.birthtime, options.birthtime.newer, options.birthtime.exact));
  }

  if (options.size){
    status.push (compare(options.size.size, obj.stats.size, options.size.larger));

  }
  const x = status.filter(function (a){
    return !a;
  });
  if (x.length === 0) return true;

  return false;
}
Find.prototype._stat = function(location, callback){
  const self = this;
  fs.stat(location, function (err, stats){
    const _location = path.join(self.base, location)
    if (err){
      if (self.isCallback){
        self.output.errors.push({
          path : _location,
          error : err
        });
      }

      return callback();
    }

    const obj = {
      path : _location,
      stats : stats
    };

    if (self.hidden === false){
      if (isHidden(_location)){
        emitter.emit('hidden', _location, stats);
        return setImmediate(callback);
      }
    }

    if (stats.isDirectory()){
      if (self.isCallback){
        self.output.directorys.push(obj);
      }

      emitter.emit('directory', _location, stats);
      return self.dir(location, callback);
    }

    if (stats.isFile()){


      if (matchFile(obj, self.options)){
        if (self.isCallback){
          self.output.files.push(obj);
        }
        emitter.emit('file', _location, stats);
      }

    }
    setImmediate(callback)
  });
}


function compare(a, b, larger, exact){
  if (exact) {
    return (a === b);
  }
  if (larger){
    return (a < b);
  }
  return (a > b);
}
module.exports = Find;
