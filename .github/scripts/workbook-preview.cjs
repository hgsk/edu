const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const { marked } = require('marked');
const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const style = `body{margin:0;background:#fff;color:#24292f;font:16px/1.7 system-ui,sans-serif}main{max-width:960px;margin:auto;padding:32px}h1,h2,h3{line-height:1.4}h1,h2{border-bottom:1px solid #d8dee4;padding-bottom:10px}a{color:#0969da}img{max-width:100%;height:auto}pre{padding:16px;background:#f6f8fa;overflow:auto}code{font-family:monospace}table{display:block;overflow:auto;border-collapse:collapse}td,th{padding:6px 12px;border:1px solid #d0d7de}blockquote{margin:16px 0;padding:0 16px;border-left:4px solid #d0d7de;color:#57606a}details{padding:12px;border:1px solid #d0d7de}@media(max-width:600px){main{padding:16px;font-size:15px}}`;
const server = http.createServer((req,res) => {
  const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.'+requested);
  if (!file.startsWith(root+'/')) {res.writeHead(403);return res.end();}
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404);return res.end('Not found');}
  if (file.endsWith('.md')) {
    const used = new Map();
    const html = marked.parse(fs.readFileSync(file,'utf8')).replace(/<h([1-6])>(.*?)<\/h\1>/gs, (_,level,title) => {
      const text = title.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"');
      const base = text.toLowerCase().replace(/[^\p{L}\p{N}_\- ]/gu,'').replace(/ /g,'-');
      const n = used.get(base)||0; used.set(base,n+1);
      return `<h${level} id="${base}${n?'-'+n:''}">${title}</h${level}>`;
    });
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
    return res.end(`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(path.basename(file))}</title><style>${style}</style><main>${html}</main></html>`);
  }
  const types={'.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.css':'text/css','.html':'text/html; charset=utf-8'};
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});
server.listen(0,'127.0.0.1',()=>console.log(server.address().port));
