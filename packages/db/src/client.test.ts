import { afterEach, describe, expect, it } from 'vitest';
import { InMemoryDB, _resetDbCache, getDb, openDb, type DB } from './client.js';
import { NodeSqliteDB } from './node-sqlite.js';

describe('openDb / getDb', () => {
  afterEach(() => _resetDbCache());

  it('openDb({ opfs: false }) in node ritorna NodeSqliteDB (SQLite reale)', async () => {
    const db = await openDb({ opfs: false });
    expect(db).toBeInstanceOf(NodeSqliteDB);
  });

  it('openDb() in node (no window) ritorna NodeSqliteDB (SQLite reale)', async () => {
    // ambiente vitest/node: hasOpfs() false → path NodeSqliteDB
    const db = await openDb();
    expect(db).toBeInstanceOf(NodeSqliteDB);
  });

  it('getDb cachea il singleton', async () => {
    const a = await getDb({ opfs: false });
    const b = await getDb();
    expect(a).toBe(b);
    _resetDbCache();
    const c = await getDb({ opfs: false });
    expect(c).not.toBe(a);
  });

  it('openDb({ opfs: true }) → backend sqlite-wasm o fallback robusto', async () => {
    // forziamo opfs: true in node: ora sqlite-wasm ha un path node nell'exports map
    // e potrebbe caricarsi (BrowserSqliteDB). Se non caricabile, cade su InMemoryDB.
    // L'invariante: openDb NON throwa mai, ritorna sempre un DB usabile.
    const db = await openDb({ opfs: true });
    expect(db).toBeDefined();
    expect(typeof db.exec).toBe('function');
    expect(typeof db.query).toBe('function');
  });
});

describe('InMemoryDB — subset SQL', () => {
  function makeDb(): DB {
    return new InMemoryDB();
  }

  it('CREATE TABLE IF NOT EXISTS idempotente', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE IF NOT EXISTS t (id TEXT)');
    await db.exec('CREATE TABLE IF NOT EXISTS t (id TEXT)');
    await db.exec("INSERT INTO t (id) VALUES ('a')");
    expect(await db.query('SELECT id FROM t')).toHaveLength(1);
  });

  it('INSERT OR IGNORE non duplica su PRIMARY KEY', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE t (id TEXT PRIMARY KEY)');
    await db.exec("INSERT OR IGNORE INTO t (id) VALUES ('a')");
    await db.exec("INSERT OR IGNORE INTO t (id) VALUES ('a')");
    expect(await db.query('SELECT id FROM t')).toHaveLength(1);
  });

  it('SELECT * e SELECT colonne specifiche', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE t (a TEXT, b INTEGER)');
    await db.exec("INSERT INTO t (a, b) VALUES ('x', 1)");
    const star = await db.query<{ a: string; b: number }>('SELECT * FROM t');
    expect(star[0]).toEqual({ a: 'x', b: 1 });
    const cols = await db.query<{ first: string }>('SELECT a AS first FROM t');
    expect(cols[0]?.first).toBe('x');
  });

  it('UPDATE con WHERE filtra le righe', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE t (id TEXT, v INTEGER)');
    await db.exec("INSERT INTO t (id, v) VALUES ('a', 1)");
    await db.exec("INSERT INTO t (id, v) VALUES ('b', 1)");
    await db.exec('UPDATE t SET v = 2 WHERE id = ?', ['a']);
    const rows = await db.query<{ id: string; v: number }>('SELECT id, v FROM t');
    const byId = new Map(rows.map((r) => [r.id, r.v]));
    expect(byId.get('a')).toBe(2);
    expect(byId.get('b')).toBe(1);
  });

  it('UPDATE con SET multipli', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE t (a TEXT, b TEXT, c TEXT)');
    await db.exec("INSERT INTO t (a, b, c) VALUES ('1', '2', '3')");
    await db.exec("UPDATE t SET b = 'X', c = 'Y' WHERE a = '1'");
    const rows = await db.query<{ a: string; b: string; c: string }>('SELECT a, b, c FROM t');
    expect(rows[0]).toEqual({ a: '1', b: 'X', c: 'Y' });
  });

  it('DELETE FROM con WHERE', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE t (id TEXT)');
    await db.exec("INSERT INTO t (id) VALUES ('a')");
    await db.exec("INSERT INTO t (id) VALUES ('b')");
    await db.exec("DELETE FROM t WHERE id = 'a'");
    expect(await db.query('SELECT id FROM t')).toHaveLength(1);
  });

  it('DELETE FROM senza WHERE svuota la tabella', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE t (id TEXT)');
    await db.exec("INSERT INTO t (id) VALUES ('a')");
    await db.exec('DELETE FROM t');
    expect(await db.query('SELECT id FROM t')).toEqual([]);
  });

  it('WHERE con IS NULL / IS NOT NULL', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE t (id TEXT, k TEXT)');
    await db.exec("INSERT INTO t (id, k) VALUES ('a', NULL)");
    await db.exec("INSERT INTO t (id, k) VALUES ('b', 'x')");
    const nulls = await db.query<{ id: string }>('SELECT id FROM t WHERE k IS NULL');
    expect(nulls[0]?.id).toBe('a');
    const notNulls = await db.query<{ id: string }>('SELECT id FROM t WHERE k IS NOT NULL');
    expect(notNulls[0]?.id).toBe('b');
  });

  it('ORDER BY col ASC/DESC', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE t (id TEXT)');
    for (const id of ['c', 'a', 'b']) await db.exec('INSERT INTO t (id) VALUES (?)', [id]);
    const asc = await db.query<{ id: string }>('SELECT id FROM t ORDER BY id ASC');
    expect(asc.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    const desc = await db.query<{ id: string }>('SELECT id FROM t ORDER BY id DESC');
    expect(desc.map((r) => r.id)).toEqual(['c', 'b', 'a']);
  });

  it('LIMIT n', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE t (id TEXT)');
    for (const id of ['a', 'b', 'c']) await db.exec('INSERT INTO t (id) VALUES (?)', [id]);
    const r = await db.query<{ id: string }>('SELECT id FROM t ORDER BY id ASC LIMIT 2');
    expect(r.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('WHERE con AND multipli', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE t (a TEXT, b INTEGER)');
    await db.exec("INSERT INTO t (a, b) VALUES ('x', 1)");
    await db.exec("INSERT INTO t (a, b) VALUES ('x', 2)");
    const r = await db.query<{ b: number }>(
      "SELECT b FROM t WHERE a = 'x' AND b = 2",
    );
    expect(r[0]?.b).toBe(2);
  });

  it('CREATE VIRTUAL TABLE / CREATE TRIGGER / CREATE INDEX / PRAGMA sono no-op', async () => {
    const db = makeDb();
    await expect(
      db.exec("CREATE VIRTUAL TABLE fts USING fts5(title)"),
    ).resolves.toBeUndefined();
    await expect(
      db.exec('CREATE TRIGGER tr AFTER INSERT ON x BEGIN SELECT 1; END'),
    ).resolves.toBeUndefined();
    await expect(db.exec('CREATE INDEX idx ON x(id)')).resolves.toBeUndefined();
    await expect(db.exec('PRAGMA user_version')).resolves.toBeUndefined();
    // PRAGMA come query → integrity_check ok
    const r = await db.query<{ integrity_check: string }>('PRAGMA integrity_check');
    expect(r[0]?.integrity_check).toBe('ok');
  });

  it('statement non supportato → errore', async () => {
    const db = makeDb();
    await expect(db.exec('DROP TABLE x')).rejects.toThrow();
  });

  it('LIKE case-insensitive con %', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE t (id TEXT)');
    await db.exec("INSERT INTO t (id) VALUES ('Acqua')");
    // '%acqua%' (lowercase) matcha 'Acqua' perché case-insensitive
    const r = await db.query<{ id: string }>("SELECT id FROM t WHERE id LIKE '%acqua%'");
    expect(r[0]?.id).toBe('Acqua');
    // '%CC%' uppercase matcha lo stesso
    const r2 = await db.query<{ id: string }>("SELECT id FROM t WHERE id LIKE '%CC%'");
    expect(r2).toEqual([]);
  });

  it('stringa SQL vuota → no-op', async () => {
    const db = makeDb();
    await expect(db.exec('')).resolves.toBeUndefined();
    await expect(db.exec('   ')).resolves.toBeUndefined();
  });

  it('binding di parametri misti (stringa con apice, numero, null)', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE t (s TEXT, n INTEGER, k TEXT)');
    await db.exec("INSERT INTO t (s, n, k) VALUES (?, ?, ?)", ["l'apostrofo", 42, null]);
    const r = await db.query<{ s: string; n: number; k: string | null }>('SELECT s, n, k FROM t');
    expect(r[0]?.s).toBe("l'apostrofo");
    expect(r[0]?.n).toBe(42);
    expect(r[0]?.k).toBeNull();
  });

  it('UPDATE con WHERE su IS NULL / IS NOT NULL (parseWhere basic)', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE t (id TEXT, k TEXT, v INTEGER)');
    await db.exec("INSERT INTO t (id, k, v) VALUES ('a', NULL, 1)");
    await db.exec("INSERT INTO t (id, k, v) VALUES ('b', 'x', 1)");
    await db.exec('UPDATE t SET v = 9 WHERE k IS NULL');
    const r = await db.query<{ id: string; v: number }>('SELECT id, v FROM t');
    const byId = new Map(r.map((x) => [x.id, x.v]));
    expect(byId.get('a')).toBe(9);
    expect(byId.get('b')).toBe(1);
    await db.exec('UPDATE t SET v = 7 WHERE k IS NOT NULL');
    const r2 = await db.query<{ id: string; v: number }>('SELECT id, v FROM t');
    const byId2 = new Map(r2.map((x) => [x.id, x.v]));
    expect(byId2.get('b')).toBe(7);
  });

  it('DELETE con WHERE su IS NOT NULL', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE t (id TEXT, k TEXT)');
    await db.exec("INSERT INTO t (id, k) VALUES ('a', 'x')");
    await db.exec("INSERT INTO t (id, k) VALUES ('b', NULL)");
    await db.exec('DELETE FROM t WHERE k IS NOT NULL');
    const r = await db.query<{ id: string }>('SELECT id FROM t');
    expect(r.map((x) => x.id)).toEqual(['b']);
  });

  it('UPDATE con WHERE non riconosciuta → match-all (fail safe)', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE t (id TEXT, v INTEGER)');
    await db.exec("INSERT INTO t (id, v) VALUES ('a', 1)");
    await db.exec("INSERT INTO t (id, v) VALUES ('b', 1)");
    // condizione non riconosciuta (es. BETWEEN) → match-all: tutte le righe aggiornate
    await db.exec("UPDATE t SET v = 5 WHERE v BETWEEN 1 AND 2");
    const r = await db.query<{ v: number }>('SELECT v FROM t');
    expect(r.every((x) => x.v === 5)).toBe(true);
  });

  it('SELECT con WHERE non riconosciuta → match-all (fail safe)', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE t (id TEXT)');
    await db.exec("INSERT INTO t (id) VALUES ('a')");
    await db.exec("INSERT INTO t (id) VALUES ('b')");
    const r = await db.query<{ id: string }>('SELECT id FROM t WHERE id IN (1,2)');
    expect(r).toHaveLength(2);
  });

  it('SELECT con JOIN/MATCH non supportato → errore', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE t (id TEXT)');
    await expect(
      db.query('SELECT * FROM t INNER JOIN u ON t.id = u.id'),
    ).rejects.toThrow();
  });

  it('WHERE con operatori di confronto (>=, <=, >, <, <>, !=) su stringhe ISO', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE rc (id TEXT, fired_at TEXT)');
    await db.exec("INSERT INTO rc (id, fired_at) VALUES ('a', '2025-07-05T09:00:00.000Z')");
    await db.exec("INSERT INTO rc (id, fired_at) VALUES ('b', '2025-07-06T12:00:00.000Z')");
    await db.exec("INSERT INTO rc (id, fired_at) VALUES ('c', '2025-07-07T15:00:00.000Z')");

    // range [09:00 day1, 23:59 day1] → solo 'a'
    const day1 = await db.query<{ id: string }>(
      "SELECT id FROM rc WHERE fired_at >= '2025-07-05T00:00:00.000Z' AND fired_at <= '2025-07-05T23:59:59.000Z'",
    );
    expect(day1.map((r) => r.id)).toEqual(['a']);

    // > day1
    const after = await db.query<{ id: string }>(
      "SELECT id FROM rc WHERE fired_at > '2025-07-05T23:59:59.000Z'",
    );
    expect(after.map((r) => r.id)).toEqual(['b', 'c']);

    // < day3
    const before = await db.query<{ id: string }>(
      "SELECT id FROM rc WHERE fired_at < '2025-07-07T00:00:00.000Z'",
    );
    expect(before.map((r) => r.id)).toEqual(['a', 'b']);

    // <> (diverso da 'a')
    const notA = await db.query<{ id: string }>(
      "SELECT id FROM rc WHERE fired_at <> '2025-07-05T09:00:00.000Z'",
    );
    expect(notA.map((r) => r.id)).toEqual(['b', 'c']);

    // != come alias
    const neq = await db.query<{ id: string }>(
      "SELECT id FROM rc WHERE fired_at != '2025-07-05T09:00:00.000Z'",
    );
    expect(neq.length).toBe(2);
  });

  it('WHERE con confronto numerico', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE n (id TEXT, v INTEGER)');
    await db.exec('INSERT INTO n (id, v) VALUES (\'a\', 5)');
    await db.exec('INSERT INTO n (id, v) VALUES (\'b\', 10)');
    const gt = await db.query<{ id: string }>('SELECT id FROM n WHERE v >= 8');
    expect(gt.map((r) => r.id)).toEqual(['b']);
    const lt = await db.query<{ id: string }>('SELECT id FROM n WHERE v < 8');
    expect(lt.map((r) => r.id)).toEqual(['a']);
  });

  it('confronto su NULL → false (non matcha)', async () => {
    const db = makeDb();
    await db.exec('CREATE TABLE n (id TEXT, v INTEGER)');
    await db.exec('INSERT INTO n (id, v) VALUES (\'a\', NULL)');
    const r = await db.query<{ id: string }>('SELECT id FROM n WHERE v >= 0');
    expect(r.length).toBe(0);
  });
});
