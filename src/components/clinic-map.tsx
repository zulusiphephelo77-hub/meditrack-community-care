import { useEffect,useState } from 'react';
import { Truck,MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
export type MapStop={id:string;name:string;lat:number;lng:number};
export function ClinicMap({stops,name,status}:{stops:MapStop[];name:string;status:string}){
 const [step,setStep]=useState(0);const [moving,setMoving]=useState(true);
 useEffect(()=>{if(!moving || window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const t=setInterval(()=>setStep(s=>(s+1)%100),1800);return()=>clearInterval(t)},[moving]);
 return <div className="relative overflow-hidden rounded-lg border border-border bg-patient-soft">
 <svg viewBox="0 0 600 290" className="h-64 w-full" role="img" aria-label={`Simulated route for ${name}`}>
 <rect width="600" height="290" className="fill-muted"/>
 <path d="M0 80H600 M0 190H600 M120 0V290 M320 0V290 M500 0V290" className="stroke-card" strokeWidth="22"/>
 <path d="M0 268 Q120 240 220 280 T600 238" fill="none" className="stroke-facility/20" strokeWidth="28"/>
 <path d="M80 210 L180 190 L300 110 L450 90 L530 45" fill="none" className="stroke-primary" strokeWidth="5" strokeDasharray="9 6"/>
 {stops.map((s,i)=><g key={s.id} transform={`translate(${100+i*170},${210-i*70})`}><circle r="12" className="fill-card stroke-primary" strokeWidth="4"/><text y="30" textAnchor="middle" className="fill-foreground text-[13px]">{s.name.length>22?s.name.slice(0,22)+'…':s.name}</text></g>)}
 <g transform={`translate(${80+step*4.5},${210-step*1.65})`}><circle r="21" className="fill-primary stroke-card" strokeWidth="4"/><foreignObject x="-12" y="-12" width="24" height="24"><Truck className="h-6 w-6 text-primary-foreground"/></foreignObject></g>
 </svg>
 <div className="absolute left-3 top-3 rounded-md bg-card px-3 py-2 text-xs shadow-card"><p className="font-semibold">{name}</p><p className="text-muted-foreground">Simulated GPS · {status}</p></div>
 <Button variant="outline" size="sm" className="absolute right-3 bottom-3" onClick={()=>setMoving(!moving)}><MapPin/>{moving?'Pause GPS':'Resume GPS'}</Button>
 </div>
}
