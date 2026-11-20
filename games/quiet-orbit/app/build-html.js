// Regenerates game.js from the game page (../orbit/quiet-orbit.html by default).
const fs=require('fs');
const src=process.argv[2]||'../web/quiet-orbit.html';
const body=fs.readFileSync(src,'utf8');
const head='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><style>html,body{margin:0;padding:0;background:#0b0e18}[hidden]{display:none!important}</style></head><body>';
fs.writeFileSync('game.js','// Generated from quiet-orbit.html. Rebuild with: node build-html.js\nexport default '+JSON.stringify(head+body+'</body></html>')+';\n');
