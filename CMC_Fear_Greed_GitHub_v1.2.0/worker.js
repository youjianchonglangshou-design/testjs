// CMC Fear & Greed Worker v1.3.0 — no API keys, schedules or storage.
// Deploy separately as a NEW Cloudflare Worker; do not overwrite any existing Worker.
const CMC = 'https://pro-api.coinmarketcap.com/public-api/v3/fear-and-greed/';
const BTC = 'https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=365';
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type','X-Content-Type-Options':'nosniff'};
function respond(body,status=200,extra={}) {return new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=300',...extra}})}
export default {
 async fetch(request, env, ctx){
  const u=new URL(request.url);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='GET')return respond({error:'Method not allowed'},405);
  if(u.pathname==='/' || u.pathname==='/health')return respond({ok:true,service:'CMC Fear & Greed Proxy',version:'1.3.0',routes:['/api/latest','/api/historical','/api/btc']});
  const routes={'/api/latest':{url:CMC+'latest',ttl:900},'/api/historical':{url:CMC+'historical?limit=370',ttl:21600},'/api/btc':{url:BTC,ttl:3600}};
  const route=routes[u.pathname];if(!route)return respond({error:'Not found'},404);
  const cacheKey=new Request('https://cmc-worker-cache.internal'+u.pathname);
  const cache=caches.default;
  const hit=await cache.match(cacheKey);if(hit){const headers=new Headers(hit.headers);headers.set('Access-Control-Allow-Origin','*');headers.set('X-Data-Cache','HIT');return new Response(hit.body,{status:hit.status,headers})}
  try{
   const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
   let upstream;
   try {upstream=await fetch(route.url,{method:'GET',headers:{'Accept':'application/json','User-Agent':'CMC-Fear-Greed-Viewer/1.3'},signal:controller.signal,redirect:'follow'});}finally{clearTimeout(timeout)}
   if(!upstream.ok)return respond({error:'Upstream HTTP '+upstream.status,source:u.pathname},502,{'Cache-Control':'no-store'});
   const data=await upstream.json();
   if(u.pathname==='/api/btc'){
     if(!Array.isArray(data?.Data?.Data))throw Error('BTC data missing');
   } else {
     if(String(data?.status?.error_code??0)!=='0')throw Error('CMC: '+(data?.status?.error_message||data?.status?.error_code));
     if(u.pathname==='/api/historical'&&!Array.isArray(data?.data))throw Error('CMC history data missing');
     if(u.pathname==='/api/latest'&&!data?.data)throw Error('CMC latest data missing');
   }
   const response=respond(data,200,{'Cache-Control':'public, max-age='+route.ttl,'X-Data-Cache':'MISS'});
   ctx.waitUntil(cache.put(cacheKey,response.clone()));return response;
  } catch(e){return respond({error:String(e?.message||e),source:u.pathname},502,{'Cache-Control':'no-store'})}
 }
};
