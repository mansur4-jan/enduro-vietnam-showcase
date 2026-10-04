DROP POLICY leads_access ON leads;
-- statement-break
CREATE POLICY leads_read ON leads FOR SELECT TO enduro_app USING(app_permission('leads') OR (app_role()='staff' AND assigned_to=app_uid()));
-- statement-break
CREATE POLICY leads_insert ON leads FOR INSERT TO enduro_app WITH CHECK(app_permission('leads'));
-- statement-break
CREATE POLICY leads_update ON leads FOR UPDATE TO enduro_app USING(app_permission('leads') OR (app_role()='staff' AND assigned_to=app_uid())) WITH CHECK(app_permission('leads') OR (app_role()='staff' AND assigned_to=app_uid()));
-- statement-break
CREATE POLICY leads_delete ON leads FOR DELETE TO enduro_app USING(app_permission('leads'));
-- statement-break
CREATE FUNCTION guard_assigned_lead() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF current_user='enduro_app' AND NOT app_permission('leads') AND ((to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status')) THEN RAISE EXCEPTION 'Assigned staff may only change lead status'; END IF; RETURN NEW; END $$;
-- statement-break
CREATE TRIGGER leads_columns BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION guard_assigned_lead();
