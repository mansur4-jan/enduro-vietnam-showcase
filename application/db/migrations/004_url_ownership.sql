CREATE FUNCTION guard_url_ownership() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF current_user='enduro_app' AND NEW.offering_id IS DISTINCT FROM OLD.offering_id THEN RAISE EXCEPTION 'URL belongs to another page'; END IF; RETURN NEW; END $$;
-- statement-break
CREATE TRIGGER url_ownership BEFORE UPDATE ON url_registry FOR EACH ROW EXECUTE FUNCTION guard_url_ownership();
