CREATE TABLE public.device_actions (id uuid PRIMARY KEY, facility_id uuid NOT NULL REFERENCES public.facilities(id), payload jsonb NOT NULL, result_id uuid, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.device_actions TO authenticated;
GRANT ALL ON public.device_actions TO service_role;
ALTER TABLE public.device_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY device_actions_read ON public.device_actions FOR SELECT TO authenticated USING (facility_id=public.my_facility_id());
ALTER TABLE public.stock_transfers ADD COLUMN required_by date;
ALTER TABLE public.stock_transfers ADD COLUMN eta timestamptz;
CREATE TABLE public.mobile_clinics (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), facility_id uuid NOT NULL REFERENCES public.facilities(id), name text NOT NULL, status text NOT NULL DEFAULT 'Loading' CHECK(status IN ('Loading','En route','Arrived','Completed')), lat double precision NOT NULL, lng double precision NOT NULL);
GRANT SELECT, INSERT, UPDATE ON public.mobile_clinics TO authenticated;
GRANT ALL ON public.mobile_clinics TO service_role;
ALTER TABLE public.mobile_clinics ENABLE ROW LEVEL SECURITY;
CREATE POLICY mobile_read ON public.mobile_clinics FOR SELECT TO authenticated USING (true);
CREATE POLICY mobile_manage ON public.mobile_clinics FOR ALL TO authenticated USING (public.has_role(auth.uid(),'facility') AND facility_id=public.my_facility_id()) WITH CHECK (public.has_role(auth.uid(),'facility') AND facility_id=public.my_facility_id());
CREATE TABLE public.mobile_stops (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), clinic_id uuid NOT NULL REFERENCES public.mobile_clinics(id), name text NOT NULL, lat double precision NOT NULL, lng double precision NOT NULL, scheduled_at timestamptz NOT NULL, sequence integer NOT NULL DEFAULT 1);
GRANT SELECT, INSERT, UPDATE ON public.mobile_stops TO authenticated;
GRANT ALL ON public.mobile_stops TO service_role;
ALTER TABLE public.mobile_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY stops_read ON public.mobile_stops FOR SELECT TO authenticated USING (true);
CREATE POLICY stops_manage ON public.mobile_stops FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM public.mobile_clinics c WHERE c.id=clinic_id AND c.facility_id=public.my_facility_id()) AND public.has_role(auth.uid(),'facility')) WITH CHECK (EXISTS(SELECT 1 FROM public.mobile_clinics c WHERE c.id=clinic_id AND c.facility_id=public.my_facility_id()) AND public.has_role(auth.uid(),'facility'));
CREATE TABLE public.mobile_stock (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), clinic_id uuid NOT NULL REFERENCES public.mobile_clinics(id), medicine_id uuid NOT NULL REFERENCES public.medicines(id), quantity integer NOT NULL DEFAULT 0 CHECK(quantity>=0), UNIQUE(clinic_id,medicine_id));
GRANT SELECT, INSERT, UPDATE ON public.mobile_stock TO authenticated;
GRANT ALL ON public.mobile_stock TO service_role;
ALTER TABLE public.mobile_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY van_stock_read ON public.mobile_stock FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'facility'));
CREATE POLICY van_stock_manage ON public.mobile_stock FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM public.mobile_clinics c WHERE c.id=clinic_id AND c.facility_id=public.my_facility_id()) AND public.has_role(auth.uid(),'facility')) WITH CHECK (EXISTS(SELECT 1 FROM public.mobile_clinics c WHERE c.id=clinic_id AND c.facility_id=public.my_facility_id()) AND public.has_role(auth.uid(),'facility'));
CREATE TABLE public.mobile_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id uuid NOT NULL REFERENCES public.patients(id), stop_id uuid NOT NULL REFERENCES public.mobile_stops(id), medicine_id uuid NOT NULL REFERENCES public.medicines(id), quantity integer NOT NULL CHECK(quantity>0), status text NOT NULL DEFAULT 'Submitted' CHECK(status IN ('Submitted','Preparing','Ready on vehicle','Collected','Not available')), sms text NOT NULL DEFAULT 'Simulated SMS: Your medicine request has been submitted.', created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.mobile_requests TO authenticated;
GRANT ALL ON public.mobile_requests TO service_role;
ALTER TABLE public.mobile_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY mobile_requests_read ON public.mobile_requests FOR SELECT TO authenticated USING (patient_id=public.current_patient_id() OR public.has_role(auth.uid(),'facility'));
CREATE OR REPLACE FUNCTION public.request_mobile_medicine(_stop uuid,_medicine uuid,_quantity integer) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p uuid:=public.current_patient_id(); rid uuid;
BEGIN
 IF p IS NULL OR NOT public.has_role(auth.uid(),'patient') THEN RAISE EXCEPTION 'Patient sign-in required'; END IF;
 IF _quantity IS NULL OR _quantity<1 OR _quantity>1000 THEN RAISE EXCEPTION 'Quantity must be between 1 and 1000'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.patient_medicines WHERE patient_id=p AND medicine_id=_medicine) THEN RAISE EXCEPTION 'Choose a prescribed medicine'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.mobile_stops WHERE id=_stop AND scheduled_at>now()) THEN RAISE EXCEPTION 'Choose a future visit'; END IF;
 IF EXISTS(SELECT 1 FROM public.mobile_requests WHERE patient_id=p AND stop_id=_stop AND medicine_id=_medicine AND status NOT IN ('Collected','Not available')) THEN RAISE EXCEPTION 'This medicine is already requested for this visit'; END IF;
 INSERT INTO public.mobile_requests(patient_id,stop_id,medicine_id,quantity) VALUES(p,_stop,_medicine,_quantity) RETURNING id INTO rid; RETURN rid;
END $$;
CREATE OR REPLACE FUNCTION public.update_mobile_request(_id uuid,_status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.mobile_requests; c public.mobile_clinics; available integer;
BEGIN
 SELECT * INTO r FROM public.mobile_requests WHERE id=_id FOR UPDATE;
 SELECT cl.* INTO c FROM public.mobile_clinics cl JOIN public.mobile_stops s ON s.clinic_id=cl.id WHERE s.id=r.stop_id;
 IF c.facility_id IS DISTINCT FROM public.my_facility_id() OR NOT public.has_role(auth.uid(),'facility') THEN RAISE EXCEPTION 'Only the managing facility can update requests'; END IF;
 IF NOT ((r.status='Submitted' AND _status IN ('Preparing','Not available')) OR (r.status='Preparing' AND _status IN ('Ready on vehicle','Not available')) OR (r.status='Ready on vehicle' AND _status IN ('Collected','Not available'))) THEN RAISE EXCEPTION 'Invalid request status change'; END IF;
 IF _status='Ready on vehicle' THEN
 SELECT quantity INTO available FROM public.mobile_stock WHERE clinic_id=c.id AND medicine_id=r.medicine_id FOR UPDATE;
 IF coalesce(available,0)<r.quantity THEN RAISE EXCEPTION 'Van stock is insufficient'; END IF;
 UPDATE public.mobile_stock SET quantity=quantity-r.quantity WHERE clinic_id=c.id AND medicine_id=r.medicine_id;
 END IF;
 IF r.status='Ready on vehicle' AND _status='Not available' THEN UPDATE public.mobile_stock SET quantity=quantity+r.quantity WHERE clinic_id=c.id AND medicine_id=r.medicine_id; END IF;
 UPDATE public.mobile_requests SET status=_status,sms='Simulated SMS: Your medicine is ' || lower(_status) || '. Bring ID for collection.' WHERE id=_id;
END $$;
CREATE OR REPLACE FUNCTION public.sync_device_action(_id uuid,_payload jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE me uuid:=public.my_facility_id(); prev public.device_actions; b public.stock_batches; wb public.stock_batches; mid uuid:=(_payload->>'medicine')::uuid; qty integer:=(_payload->>'quantity')::integer; kind text:=_payload->>'kind'; rid uuid; wh uuid; needed integer;
BEGIN
 IF me IS NULL OR NOT public.has_role(auth.uid(),'facility') THEN RAISE EXCEPTION 'Facility sign-in required'; END IF;
 IF (_payload->>'facility')::uuid IS DISTINCT FROM me THEN RAISE EXCEPTION 'This device packet belongs to another facility'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(_id::text));
 SELECT * INTO prev FROM public.device_actions WHERE id=_id;
 IF prev.id IS NOT NULL THEN
 IF prev.facility_id<>me OR prev.payload<>_payload THEN RAISE EXCEPTION 'Packet contents do not match'; END IF;
 RETURN prev.result_id;
 END IF;
 IF qty IS NULL OR qty<0 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
 IF kind IN ('count','dispense') THEN
 SELECT * INTO b FROM public.stock_batches WHERE id=(_payload->>'batch')::uuid AND facility_id=me AND medicine_id=mid FOR UPDATE;
 IF b.id IS NULL THEN RAISE EXCEPTION 'Batch not found for your facility'; END IF;
 IF b.quantity<>(_payload->>'expected')::integer THEN RAISE EXCEPTION 'Stock changed since this device saved it. Refresh and recount before syncing.'; END IF;
 IF kind='dispense' AND qty>b.quantity THEN RAISE EXCEPTION 'Not enough pills'; END IF;
 needed:=CASE WHEN kind='count' THEN qty ELSE b.quantity-qty END;
 INSERT INTO public.stock_adjustments(batch_id,catalogue_quantity,counted_quantity,variance,reason,facility_id) VALUES(b.id,b.quantity,needed,needed-b.quantity,coalesce(nullif(_payload->>'reason',''),'Offline dispensing'),me);
 UPDATE public.stock_batches SET quantity=needed WHERE id=b.id;
 ELSIF kind='order' THEN
 IF qty<1 THEN RAISE EXCEPTION 'Order quantity must be positive'; END IF;
 wh:=(SELECT id FROM public.facilities WHERE code='pmb-wh');
 IF wh=me THEN RAISE EXCEPTION 'Warehouse cannot order from itself'; END IF;
 SELECT * INTO wb FROM public.stock_batches WHERE facility_id=wh AND medicine_id=mid AND expiry_date>=public.sim_today() AND quantity>0 ORDER BY expiry_date LIMIT 1 FOR UPDATE;
 IF wb.id IS NULL THEN RAISE EXCEPTION 'Warehouse has no stock for this medicine'; END IF;
 INSERT INTO public.stock_transfers(from_facility_id,to_facility_id,medicine_id,from_batch_id,quantity,urgency,requested_by_facility_id,source,required_by) VALUES(wh,me,mid,wb.id,qty,'normal',me,'offline_order',nullif(_payload->>'requiredBy','')::date) RETURNING id INTO rid;
 INSERT INTO public.transfer_history(stock_transfer_id,action,actor_facility_id,details) VALUES(rid,'requested',me,'Device-saved order synced');
 PERFORM public.notify(me,'auto_order','Device order synced',qty || ' pills requested from warehouse',jsonb_build_object('transfer',rid),'device:' || _id);
 PERFORM public.notify(wh,'clinic_order','New device order',qty || ' pills requested',jsonb_build_object('transfer',rid),'device-wh:' || _id);
 ELSE RAISE EXCEPTION 'Unknown device action'; END IF;
 INSERT INTO public.device_actions(id,facility_id,payload,result_id) VALUES(_id,me,_payload,rid); RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.sync_device_action(uuid,jsonb),public.request_mobile_medicine(uuid,uuid,integer),public.update_mobile_request(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sync_device_action(uuid,jsonb),public.request_mobile_medicine(uuid,uuid,integer),public.update_mobile_request(uuid,text) TO authenticated;