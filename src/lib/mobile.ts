import { supabase } from '@/integrations/supabase/client';
export async function fetchMobile(){
 const [clinics,stops,stock,requests]=await Promise.all([supabase.from('mobile_clinics').select('*').order('name'),supabase.from('mobile_stops').select('*').order('scheduled_at'),supabase.from('mobile_stock').select('*, medicines(name)'),supabase.from('mobile_requests').select('*, medicines(name), patients(full_name,patient_number)').order('created_at',{ascending:false})]);
 for(const q of [clinics,stops,stock,requests])if(q.error)throw q.error;
 return {clinics:clinics.data??[],stops:stops.data??[],stock:stock.data??[],requests:requests.data??[]};
}
export function shortfall(needed:number,available:number){return Math.max(0,needed-available);}
export const requestNext:Record<string,string>={'Submitted':'Preparing','Preparing':'Ready on vehicle','Ready on vehicle':'Collected'};
