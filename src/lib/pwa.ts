export async function registerOfflineApp() {
 const host=window.location.hostname.toLowerCase();
 const refused=!import.meta.env.PROD || window.self!==window.top || new URLSearchParams(window.location.search).get('sw')==='off' || /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(host) || /^project--.+-dev\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(host) || /(^|\.)(lovableproject\.com|lovableproject-dev\.com|beta\.lovable\.dev)$/.test(host);
 if(!('serviceWorker' in navigator))return;
 if(refused){ const registrations=await navigator.serviceWorker.getRegistrations();await Promise.all(registrations.filter(r=>[r.active,r.waiting,r.installing].some(w=>w && new URL(w.scriptURL).pathname==='/sw.js')).map(r=>r.unregister()));return; }
 const {registerSW}=await import('virtual:pwa-register'); registerSW({immediate:true});
}
