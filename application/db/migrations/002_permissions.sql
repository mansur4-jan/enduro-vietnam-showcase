DROP POLICY revision_access ON revisions;
CREATE POLICY revision_read ON revisions FOR SELECT TO enduro_app USING(EXISTS(SELECT 1 FROM offerings o WHERE o.id=offering_id));
CREATE POLICY revision_insert ON revisions FOR INSERT TO enduro_app WITH CHECK(author_id=app_uid() AND EXISTS(SELECT 1 FROM offerings o WHERE o.id=offering_id));
DROP POLICY url_write ON url_registry;
CREATE POLICY url_write ON url_registry FOR ALL TO enduro_app USING(app_permission('urls') OR app_permission('publish')) WITH CHECK(app_permission('urls') OR app_permission('publish'));
