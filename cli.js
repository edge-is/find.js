#!/usr/bin/env node

var argv = require('yargs').argv;

var Find = require('./index.js');
var chrono = require('chrono-node')
var humanSize = require('human-size');
var colors = require('colors');
var filesizeParser = require('filesize-parser');
var globToRegExp = require('glob-to-regexp');
var fs = require('fs');
var async = require('async');

var directory = argv._[0];


var options = {
  absolute : argv.a || false,
  concurrency : argv.c || 10
};


if (argv.help){
  return console.log(`
    useage : find.js /filePath/ [options]

    +N           Higer than..
    -N           Lower than.. if none than exact match is used
    --mtime      Find files baed on time, "+days ago"
    --atime
    --ctime
    --birthtime
    --size       Size of file in human size, +10Kb -10Gb ..
    -j           prints JSON
    -p           pretty print JSON
    -l           listing of files with size
    -h           make size human readable
    -v           verbose, for debugging
    -s           include stats (json only)
    --output     output to file
    -a           absolute path
`);
}

['mtime', 'ctime', 'atime', 'birthtime'].forEach(function (key){
  var value = argv[key];
  var newer = false;
  var exact = false;
  if (!value && typeof value !== 'string') return;
  var firstChar = value.charAt(0);
  if (firstChar === '-' || firstChar === '+'){
    exact = false;
    newer = (firstChar === '-') ? false : true;
    newer = (firstChar === '+') ? true  : false;
  }else{
    exact = true;
  }
  var d =  chrono.parseDate(value);

  if (d){
    options[key] = {
      time : d,
      newer : newer,
      exact : exact
    };
  }
});

(function (){
  if (argv.size && typeof argv.size  === 'string'){
    var string = argv.size;
    var firstChar = string.charAt(0);
    var larger = (firstChar === '+') ? true : false;

    if (firstChar === '-' || firstChar === '+'){
      string = string.substring(1, string.length);
    }

    var size = filesizeParser(string);

    options.size = {
      size : size,
      larger : larger
    };

  }

})();


(function (){
  if (argv.name && typeof argv.name === 'string'){
    options.match = globToRegExp(argv.name);
  }
})();

if (argv.v){
  console.log(options);
}

function error(string){
  process.stdout.write(colors.red(string+"\n"));
}
function success(string){
  process.stdout.write(colors.green(string+"\n"));

}


var find  = new Find(directory, options);
var time = new Date().getTime();

var f = find.start(function (err, output){
  if (err) return error(err);
  if (typeof argv.output !== 'string') return;
  var string = "";

  async.forEachLimit(output.files, 10, function(file, next){
    string+=parseStringForOutput(file.path, file.stats) + '\n';
    next();

  }, function (){
    fs.writeFile(argv.output, string, function (err, res){
      if (err) return error(err);
      var timeTaken = ( new Date().getTime() - time);
      success(`Wrote to file ${argv.output} in ${timeTaken} ms`);
    })

  });
});

f.on('file', function (location, stats){
  var string = parseStringForOutput(location, stats);

  if (!argv.output){
    success(string);
  }
})

function parseStringForOutput(location, stats){

  var string = location;
  var size= stats.size;

  if (argv.l){
    string = [ size, location].join('\t');
  }
  if (argv.l && argv.h){
    size = humanSize(stats.size);
    string = [ size, location].join('\t');

  }

  var pretty = null;
  if (argv.j){
    if (argv.p){
      pretty = 2;
    }
    var obj ={
      size : size,
      path : location
    };
    if (argv.s){
      obj.stats = stats;
    }

    string = JSON.stringify(obj, null, pretty);
  }

  return string;
}

f.on('err', function (err){
  error(err);
});
f.on('done', function (){
  var timeTaken = ( new Date().getTime() - time);
  if (argv.v){
    console.log('done took', timeTaken, 'ms');
  }
});
