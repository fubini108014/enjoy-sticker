const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
http.createServer((req,res)=>{
 const name = req.url.split('?')[0];
 const file = {'/':'index.html','/index.html':'index.html','/styles.css':'styles.css','/app.js':'app.js','/product.js':'product.js','/storage.js':'storage.js','/experience.js':'experience.js'}[name];
 if(!file){res.writeHead(404);res.end('Not found');return;}
 fs.readFile(path.join(root,file),(error,data)=>{if(error){res.writeHead(500);res.end('Unable to read file');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]});res.end(data);});
}).listen(4173,'127.0.0.1',()=>console.log('Enjoy Sticker: http://127.0.0.1:4173'));
