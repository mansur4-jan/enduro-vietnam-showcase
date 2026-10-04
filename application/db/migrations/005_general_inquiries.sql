-- Homepage requests can concern future destinations without a catalog offering.
-- Existing offering-linked requests retain their FK and organization ownership.
ALTER TABLE leads ALTER COLUMN offering_id DROP NOT NULL;
