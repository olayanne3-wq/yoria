import crypto from "node:crypto";
const COOKIE="yoria_beta_admin",TTL=28800,STATUSES=new Set(["pending","selected","invited","active","rejected"]);
const json=(r,s,p)=>r.status(s).json(p);
const safe=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)};
const sign=(v,k)=>crypto.createHmac("sha256",k).update(v).digest("base64url");
const token=k=>{const p=Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+TTL,scope:"beta-admin"})).toString("base64url");return p+"."+sign(p,k)};
const cookies=h=>(h||"").split(";").reduce((o,p)=>{const i=p.indexOf("=");if(i>0)o[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim());return o},{});
const valid=(t,k)=>{if(!t)return false;const [p,s]=t.split(".");if(!p||!s||!safe(s,sign(p,k)))return false;try{const d=JSON.parse(Buffer.from(p,"base64url").toString());return d.scope==="beta-admin"&&d.exp>Math.floor(Date.now()/1000)}catch{return false}};
async function sb(c,path,opt={}){const r=await fetch(`${c.url}/rest/v1/${path}`,{...opt,headers:{apikey:c.key,Authorization:`Bearer ${c.key}`,"Content-Type":"application/json",...(opt.headers||{})}});const t=await r.text();let d=t;try{d=t?JSON.parse(t):null}catch{}if(!r.ok){console.error(r.status,d);throw Error("Erreur Supabase")}return d}
export default async function handler(req,res){
res.setHeader("Cache-Control","no-store");res.setHeader("X-Frame-Options","DENY");
const c={url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY,password:process.env.BETA_ADMIN_PASSWORD};
if(!c.url||!c.key||!c.password)return json(res,500,{message:"Configuration administrateur incomplète."});
if(req.method==="POST"){const b=req.body||{};if(b.action==="login"){if(!safe(b.password||"",c.password))return json(res,401,{message:"Mot de passe incorrect."});res.setHeader("Set-Cookie",`${COOKIE}=${encodeURIComponent(token(c.password))}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL}`);return json(res,200,{success:true})}if(b.action==="logout"){res.setHeader("Set-Cookie",`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);return json(res,200,{success:true})}return json(res,400,{message:"Action inconnue."})}
if(!valid(cookies(req.headers.cookie)[COOKIE],c.password))return json(res,401,{message:"Authentification requise."});
if(req.method==="GET"){try{return json(res,200,{candidates:await sb(c,"beta_testers?select=*&order=created_at.desc",{method:"GET"})})}catch{return json(res,500,{message:"Impossible de charger les candidatures."})}}
if(req.method==="PATCH"){const b=req.body||{},id=String(b.id||""),status=String(b.status||"");if(!/^[0-9a-f-]{36}$/i.test(id)||!STATUSES.has(status))return json(res,400,{message:"Données invalides."});try{const a=await sb(c,`beta_testers?id=eq.${encodeURIComponent(id)}&select=*`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({status,updated_at:new Date().toISOString()})});if(!Array.isArray(a)||a.length!==1)return json(res,404,{message:"Candidature introuvable."});return json(res,200,{candidate:a[0]})}catch{return json(res,500,{message:"Le statut n’a pas pu être modifié."})}}
res.setHeader("Allow","GET, POST, PATCH");return json(res,405,{message:"Méthode non autorisée."});
}