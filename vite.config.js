import {defineConfig} from 'vite';
const studioRoute=(server)=>{server.middlewares.use((req,_res,next)=>{if(req.url==='/projects'||req.url==='/projects/')req.url='/projects/index.html';next();});};
export default defineConfig({plugins:[{name:'studio-route',configureServer:studioRoute,configurePreviewServer:studioRoute}],server:{proxy:{'/api':{
  target:'http://127.0.0.1:8787',
  timeout:210_000,
  proxyTimeout:210_000,
  configure(proxy){
    proxy.on('error',(_error,_req,res)=>{
      if('writeHead' in res && !res.headersSent && !res.destroyed){
        res.writeHead(502,{'Content-Type':'application/json','Cache-Control':'no-store'});
        res.end(JSON.stringify({error:'The website lost contact with the local try-on server. Keep npm run server running in a separate terminal and check that terminal for errors. The generation outcome is unknown; check ZaoAPI usage before retrying.'}));
      }
    });
  }
}}}});
