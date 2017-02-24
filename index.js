'use strict'
const async = require('async');
const fs = require('fs');

const EventEmitter = require('events');
const path = require('path');

const emitter = new EventEmitter();

var Find = function (dir, options){
  var self = this;

  self.directory = dir;

  self.options = options || {};

  self.output = {
    files : [],
    directorys : [],
    errors : []
  };

  self.options.concurrency = self.options.concurrency || 10;

  var fn = function (){}

  self.queue = async.queue(function(location, callback) {
    fs.stat(location, function (err, stats){
      if (err){
        self.output.push({
          path : location,
          error : err
        });
        return callback();
      }

      var obj = {
        path : location,
        stats : stats
      };
      if (stats.isDirectory()){
        self.output.directorys.push(obj);
        emitter.emit('directory', location, stats);
        return self.dir(location, callback);
      }

      if (stats.isFile()){
        if (matchFile(obj, self.options)){
          self.output.files.push(obj);
          emitter.emit('file', location, stats);
        }

      }

      callback();
    })
  }, self.options.concurrency);

  self.done = function(){};

  self.queue.drain = function (){
    self.done(self.output.files, self.output.folders);
  }

  return this;
}



Find.prototype.start = function (callback) {
  var self = this;
  self.done = callback || self.done;
  self.dir(self.directory);
  return emitter;
};
Find.prototype.dir = function (dir, callback) {
  var self = this;
  var fn = function (){};

  callback = callback || fn;

  fs.readdir(dir, function (err, res){
    if (err) return callback(err);
    async.forEachLimit(res, self.options.concurrency, function (value, next){
      var location = path.join(dir, value);
      self.queue.push(location, fn);
      next();
    }, callback);
  });
};

function matchFile(obj, options){
  var status = [];

  if (options.match){
    if (obj.path.match(options.match)){
      status.push(true);
    }else{
      status.push(false);
    }
  }

  if (options.mtime){
    status.push (compare(options.mtime.time, obj.stats.mtime, options.mtime.newer));
  }
  if (options.ctime){
    status.push (compare(options.ctime.time, obj.stats.ctime, options.ctime.newer));
  }
  if (options.atime){
    status.push (compare(options.atime.time, obj.stats.atime, options.atime.newer));
  }
  if (options.birthtime){
    status.push (compare(options.birthtime.time, obj.stats.birthtime, options.birthtime.newer));
  }

  if (options.size){
    status.push (compare(options.size.size, obj.stats.size, options.size.larger));

  }
  var x = status.filter(function (a){
    return !a;
  });
  if (x.length === 0) return true;

  return false;
}

function compare(a, b, larger){
  if (larger){
    return (a < b);
  }
  return (a > b);
}
module.exports = Find;
