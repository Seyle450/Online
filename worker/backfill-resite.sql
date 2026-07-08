-- Einmaliger Backfill: teilt die pauschal auf 'elyesferchichi' gesetzten Alt-Daten
-- anhand des page-Felds auf die korrekten Sites auf. Muster spiegeln deriveSite().
-- LIKE ist in SQLite für ASCII case-insensitiv ('Starscape' matcht '%starscape%').

UPDATE events SET site='pizza-blitz'   WHERE lower(page) LIKE '%pizza%blitz%';
UPDATE events SET site='hochzeit'      WHERE lower(page) LIKE '%hochzeit%';
UPDATE events SET site='antepli'       WHERE lower(page) LIKE '%antepli%';
UPDATE events SET site='hevis'         WHERE lower(page) LIKE '%hevi%';
UPDATE events SET site='bens'          WHERE lower(page) LIKE '%ben''s%' OR lower(page) LIKE 'bens.%' OR lower(page) LIKE '%/bens%';
UPDATE events SET site='cafeniki'      WHERE lower(page) LIKE '%niki%';
UPDATE events SET site='lokma'         WHERE lower(page) LIKE '%lokma%';
UPDATE events SET site='starscape'     WHERE lower(page) LIKE '%starscape%';
UPDATE events SET site='freelance'     WHERE lower(page) LIKE '%freelance%';
UPDATE events SET site='cafe-petit'    WHERE lower(page) LIKE '%cafe-petit%' OR lower(page) LIKE '%café-petit%';
UPDATE events SET site='coffee-corner' WHERE lower(page) LIKE '%coffee-corner%';
UPDATE events SET site='dilans'        WHERE lower(page) LIKE '%dilan%';
UPDATE events SET site='farfalla'      WHERE lower(page) LIKE '%farfalla%';
UPDATE events SET site='habitat'       WHERE lower(page) LIKE '%habitat%';
UPDATE events SET site='kleiner-olymp' WHERE lower(page) LIKE '%olymp%';
UPDATE events SET site='grundschule'   WHERE lower(page) LIKE '%halmerweg%' OR lower(page) LIKE '%grundschule%';
UPDATE events SET site='bay'           WHERE lower(page) LIKE '%/bay/%' OR lower(page) LIKE '%/bay';

UPDATE clicks SET site='pizza-blitz'   WHERE lower(page) LIKE '%pizza%blitz%';
UPDATE clicks SET site='hochzeit'      WHERE lower(page) LIKE '%hochzeit%';
UPDATE clicks SET site='antepli'       WHERE lower(page) LIKE '%antepli%';
UPDATE clicks SET site='hevis'         WHERE lower(page) LIKE '%hevi%';
UPDATE clicks SET site='bens'          WHERE lower(page) LIKE '%ben''s%' OR lower(page) LIKE 'bens.%' OR lower(page) LIKE '%/bens%';
UPDATE clicks SET site='cafeniki'      WHERE lower(page) LIKE '%niki%';
UPDATE clicks SET site='lokma'         WHERE lower(page) LIKE '%lokma%';
UPDATE clicks SET site='starscape'     WHERE lower(page) LIKE '%starscape%';
UPDATE clicks SET site='freelance'     WHERE lower(page) LIKE '%freelance%';
UPDATE clicks SET site='cafe-petit'    WHERE lower(page) LIKE '%cafe-petit%' OR lower(page) LIKE '%café-petit%';
UPDATE clicks SET site='coffee-corner' WHERE lower(page) LIKE '%coffee-corner%';
UPDATE clicks SET site='dilans'        WHERE lower(page) LIKE '%dilan%';
UPDATE clicks SET site='farfalla'      WHERE lower(page) LIKE '%farfalla%';
UPDATE clicks SET site='habitat'       WHERE lower(page) LIKE '%habitat%';
UPDATE clicks SET site='kleiner-olymp' WHERE lower(page) LIKE '%olymp%';
UPDATE clicks SET site='grundschule'   WHERE lower(page) LIKE '%halmerweg%' OR lower(page) LIKE '%grundschule%';
UPDATE clicks SET site='bay'           WHERE lower(page) LIKE '%/bay/%' OR lower(page) LIKE '%/bay';
