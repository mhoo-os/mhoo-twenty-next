const http = require('node:http'),
  fs = require('node:fs');
const path = require('node:path'),
  os = require('node:os');
const proofDir = fs.mkdtempSync(
  path.join(os.tmpdir(), 'finance-loader-cookie-proof-'),
);
const sharedProofExports = path.join(proofDir, 'shared.ts');
fs.writeFileSync(
  sharedProofExports,
  [
    ['CustomError', 'errors/CustomError'],
    ['getURLSafely', 'getURLSafely'],
    ['isDefined', 'validation/isDefined'],
  ]
    .map(
      ([name, file]) =>
        `export { ${name} } from '${path.resolve('packages/twenty-shared/src/utils', file)}';`,
    )
    .join('\n'),
);
require('esbuild').buildSync({
  stdin: {
    contents:
      "export {createHostFetchEnforcingPolicy} from './packages/twenty-front-component-renderer/src/host/fetch/utils/createHostFetchEnforcingPolicy'; export {fetchComponentSourceFromNetwork} from './packages/twenty-front-component-renderer/src/host/component-source/utils/fetchComponentSourceFromNetwork'; export {fetchJavaScriptModuleSourceText} from './packages/twenty-front-component-renderer/src/host/component-source/utils/fetchJavaScriptModuleSourceText';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  alias: {
    'twenty-shared/utils': sharedProofExports,
  },
  outfile: path.join(proofDir, 'loader.js'),
});
const seen = [];
const page = `<h1>Finance loader cookie boundary</h1><button id="run">Run checks</button><pre id="result">Ready</pre><script type="module">
import {fetchComponentSourceFromNetwork as component,fetchJavaScriptModuleSourceText as sdk,createHostFetchEnforcingPolicy as createHostFetch} from '/loader.js';
document.querySelector('#run').onclick=async()=>{const out=[];try{
 await fetch('/logout');
 const hostFetch=createHostFetch({allowedOrigins:[location.origin],fileStorageRedirectableUrls:[],graphqlUrl:location.origin+'/graphql'});
 const graph={url:location.origin+'/graphql',method:'POST',headers:{Authorization:'Bearer synthetic-only'}};
 if((await hostFetch(graph)).status!==401)throw Error('GraphQL without edge login allowed');out.push('PASS GraphQL without edge login denied');
 for(const [name,load] of [['component',url=>component({url})],['SDK',sdk]]){let denied=false;try{await load(location.origin+'/protected')}catch{denied=true}if(!denied)throw Error('Unauthenticated '+name+' was allowed');out.push('PASS unauthenticated '+name+' rejected');}
 await fetch('/login');
 if((await hostFetch(graph)).status!==200)throw Error('Authenticated GraphQL failed');out.push('PASS authenticated GraphQL');
 for(const request of [{...graph,headers:{}},{...graph,method:'GET'},{...graph,url:location.origin+'/other'},{...graph,url:location.origin+'/graphql?x=1'}]){
   if((await hostFetch(request)).status!==401)throw Error('Unexpected ambient cookie outside GraphQL boundary');
 }out.push('PASS other paths, query variants, methods and missing bearer omit cookies');
 let redirectDenied=false;try{await hostFetch({...graph,body:'redirect'})}catch{redirectDenied=true}if(!redirectDenied)throw Error('GraphQL redirect followed');out.push('PASS GraphQL redirect denied');
 if(await component({url:location.origin+'/protected'})!=='bundle')throw Error('Component not loaded');out.push('PASS authenticated component');
 if(await sdk(location.origin+'/protected')!=='bundle')throw Error('SDK not loaded');out.push('PASS authenticated SDK');
 await component({url:location.origin+'/handoff',headers:{Authorization:'Bearer synthetic-only'}});
 await component({url:'http://127.0.0.1:8798/cross-component'});
 await sdk('http://127.0.0.1:8798/cross-sdk');
 await component({url:location.origin+'/redirect',headers:{Authorization:'Bearer synthetic-only'}});
 const logs=await (await fetch('/seen')).json();
 for(const row of logs){if(row.cookie||row.authorization)throw Error('Credentials leaked: '+row.path);out.push('PASS no credentials '+row.path)}
 if(logs.length!==4)throw Error('Expected four cross-origin requests');
 document.querySelector('#result').textContent=out.join('\\n')+'\\nALL PASSED';
 await fetch('/result',{method:'POST',body:JSON.stringify(out)});
}catch(e){document.querySelector('#result').textContent=out.join('\\n')+'\\nFAIL '+e.message}};
</script>`;
http
  .createServer((req, res) => {
    const route = req.url.split('?')[0];
    if (route === '/') {
      res.setHeader('Content-Type', 'text/html');
      return res.end(page);
    }
    if (route === '/loader.js') {
      res.setHeader('Content-Type', 'application/javascript');
      return res.end(fs.readFileSync(path.join(proofDir, 'loader.js')));
    }
    if (route === '/login') {
      res.setHeader(
        'Set-Cookie',
        'edgeSession=synthetic; HttpOnly; SameSite=Lax; Path=/',
      );
      return res.end('ok');
    }
    if (route === '/logout') {
      res.setHeader('Set-Cookie', 'edgeSession=; Max-Age=0; Path=/');
      return res.end('ok');
    }
    if (route === '/seen') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(seen));
    }
    if (route === '/result') {
      let body = '';
      req.on('data', (x) => (body += x));
      req.on('end', () => {
        fs.writeFileSync(
          require('node:path').join(proofDir, 'result.json'),
          body,
        );
        res.end('saved');
      });
      return;
    }
    if (!req.headers.cookie?.includes('edgeSession=synthetic')) {
      res.statusCode = 401;
      return res.end('Login required');
    }
    if (route === '/graphql' && req.method === 'POST') {
      if (req.headers.authorization !== 'Bearer synthetic-only') {
        res.statusCode = 403;
        return res.end('Bearer required');
      }
      let body = '';
      req.on('data', (x) => (body += x));
      req.on('end', () => {
        if (body === 'redirect') {
          res.statusCode = 302;
          res.setHeader('Location', 'http://127.0.0.1:8798/graphql-redirect');
          return res.end();
        }
        res.setHeader('Content-Type', 'application/json');
        res.end('{"data":{"ok":true}}');
      });
      return;
    }
    if (route === '/handoff') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(
        JSON.stringify({ url: 'http://127.0.0.1:8798/presigned' }),
      );
    }
    if (route === '/redirect') {
      res.statusCode = 302;
      res.setHeader('Location', 'http://127.0.0.1:8798/redirect-target');
      return res.end();
    }
    res.setHeader('Content-Type', 'application/javascript');
    res.end('bundle');
  })
  .listen(8797, '127.0.0.1');
http
  .createServer((req, res) => {
    seen.push({
      path: req.url,
      cookie: !!req.headers.cookie,
      authorization: !!req.headers.authorization,
    });
    res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:8797');
    res.setHeader('Content-Type', 'application/javascript');
    res.end('bundle');
  })
  .listen(8798, '127.0.0.1');
console.log('Cookie boundary proof ready on http://127.0.0.1:8797');
