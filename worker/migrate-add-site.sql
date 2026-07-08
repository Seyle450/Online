-- EINMALIGE Migration für eine bereits bestehende Datenbank:
-- fügt die site-Spalte hinzu, taggt Alt-Daten und legt Indizes an.
--
-- Ausführen (Reihenfolge egal, aber NUR EINMAL):
--   wrangler d1 execute portfolio-analytics --remote --file=migrate-add-site.sql
--
-- Läuft die Migration ein zweites Mal, meldet SQLite "duplicate column name: site"
-- – das ist harmlos und bedeutet nur, dass die Spalte schon existiert.

ALTER TABLE events ADD COLUMN site TEXT;
ALTER TABLE clicks ADD COLUMN site TEXT;

-- Alt-Daten (vor Einführung der Mandantentrennung) der Hauptseite zuordnen.
-- Der Master sieht ohnehin alles; Kunden-Dashboards zeigen erst die ab Login
-- neu und korrekt getaggten Daten. Wer die Historie feiner aufteilen will,
-- kann stattdessen gezielte UPDATEs nach page-Muster fahren (siehe AUTH-README.md).
UPDATE events SET site = 'elyesferchichi' WHERE site IS NULL;
UPDATE clicks SET site = 'elyesferchichi' WHERE site IS NULL;

CREATE INDEX IF NOT EXISTS idx_events_site ON events(site);
CREATE INDEX IF NOT EXISTS idx_clicks_site ON clicks(site);
