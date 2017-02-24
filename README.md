# find.js
Find files in directorys

usage

find('folder', [options]);

```
const Find = require('find.js');

var find  = new Find('./some/folder/somewhere..', {
    match : new RegExp(...),
    mtime : { newer : true, time : new Date(...) }
});

var time = new Date().getTime();
var f = find.start(function response(files, folders){
  var timeTaken = ( new Date().getTime() - time);
  console.log(files.length, timeTaken, 'ms');
});

f.on('file', function (file, stats){
    ....
})
f.on('directory', function (dir, stats){
    ....
});

```
