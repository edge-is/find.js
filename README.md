# find.js
Find files in directorys

install
npm install find.js

CLI

npm install find.js -g

Cli usage
findjs -h
or
./node_modules/.bin/find.js/cli.js


Library usage

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

Options are

```
options : {
  mtime      : { time : '..dateobject..', newer: 'true|false' }
  atime      : { time : '..dateobject..', newer: 'true|false' }
  ctime      : { time : '..dateobject..', newer: 'true|false' }
  birthtime  : { time : '..dateobject..', newer: 'true|false' }
  size       : { size : 'size in bytes',  larger: 'true|false' }
  absolute: 'true|false'
};

var Find = new Find('dir', [optinal options]);
find.start([optional callback]);

```

find returns event handler
events are:
- err
- file
- directory
- done
