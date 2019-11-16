const helpers = require('./helpers');
const sqlite3 = require('sqlite3').verbose();

const provincias = [
    "BUENOS AIRES",
    "CAPITAL FEDERAL",
    "CATAMARCA",
    "CHACO",
    "CHUBUT",
    "CORDOBA",
    "CORRIENTES",
    "ENTRE RIOS",
    "FORMOSA",
    "JUJUY",
    "LA PAMPA",
    "LA RIOJA",
    "MENDOZA",
    "MISIONES",
    "NEUQUEN",
    "RIO NEGRO",
    "SALTA",
    "SAN JUAN",
    "SAN LUIS",
    "SANTA CRUZ",
    "SANTA FE",
    "SANTIAGO DEL ESTERO",
    "TIERRA DEL FUEGO",
    "TUCUMAN",
];

async function createTables(db) {
    console.log(await helpers.run(db, 'DROP TABLE IF EXISTS medico'));
    console.log(await helpers.run(db, 'DROP TABLE IF EXISTS localidad'));
    console.log(await helpers.run(db, 'DROP TABLE IF EXISTS depto'));
    console.log(await helpers.run(db, 'DROP TABLE IF EXISTS provincia'));

    console.log(await helpers.run(db, 'CREATE TABLE IF NOT EXISTS medico ( id INTEGER PRIMARY KEY,' +
        'provincia_id INTEGER NOT NULL,' +
        'depto_id  INTEGER NOT NULL,  ' +
        'localidad_id INTEGER NOT NULL,' +
        'd_prestador TEXT NOT NULL,' +
        'c_prestador TEXT NOT NULL,' +
        'c_paquete TEXT NOT NULL,' +
        'd_bate TEXT NOT NULL,' +
        'direccion TEXT NOT NULL,' +
        'depto TEXT NOT NULL,' +
        'localidad TEXT NOT NULL,' +
        'cant_loc TEXT NOT NULL,' +
        'cant_prest TEXT NOT NULL,' +
        'cant_depto TEXT NOT NULL,' +
        'cupo TEXT NOT NULL' +
        ');'));
    console.log(await helpers.run(db, 'CREATE TABLE IF NOT EXISTS localidad ( id INTEGER PRIMARY KEY,' +
        'provincia_id INTEGER NOT NULL, ' +
        'depto_id  INTEGER NOT NULL,' +
        'c_id TEXT NOT NULL,' +
        'valor TEXT NOT NULL);'));
    console.log(await helpers.run(db, 'CREATE TABLE IF NOT EXISTS depto( id INTEGER PRIMARY KEY,' +
        'provincia_id INTEGER NOT NULL,' +
        'c_id TEXT NOT NULL,' +
        'valor TEXT NOT NULL);'));
    console.log(await helpers.run(db, 'CREATE TABLE IF NOT EXISTS provincia( id INTEGER PRIMARY KEY,' +
        'name TEXT NOT NULL UNIQUE);'));
}


async function main() {
    const cont = await helpers.ask('This script delete tables, continue (yes/no) ?');
    if (cont.toLowerCase() !== 'yes') {
        return;
    }
    // open the database connection
    let db = new sqlite3.Database('./collect.db');
    await createTables(db);
    try {
        for (const p of provincias) {
            const pRet = await helpers.run(db, 'INSERT INTO provincia(name) VALUES (?)', [p]);
            const pId = pRet.lastID;
            const dData = await helpers.apiCall("https://www.pami.org.ar/listado-mdc-depto", "prov=" + p);
            for (const d of dData) {
                const deptoId = d['C_ID'];
                const depto = d['VALOR'];
                const dRet = await helpers.run(db, 'INSERT INTO depto(provincia_id, c_id, valor) VALUES (?, ?, ?)', [pId, deptoId, depto]);
                const dId = dRet.lastID;
                const lData = await helpers.apiCall("https://www.pami.org.ar/listado-mdc-localidad", 'prov=' + p + '&depto=' + depto);
                for (const l of lData) {
                    const localidadId = l['C_ID'];
                    const localidad = l['VALOR'];
                    const lRet = await helpers.run(db, 'INSERT INTO localidad(provincia_id, depto_id, c_id, valor) VALUES (?, ?, ?, ?)',
                        [pId, dId, localidadId, localidad]);
                    const lId = lRet.lastID;
                    const mData = await helpers.apiCall("https://www.pami.org.ar/listado-mdc-medicos", 'prov=' + p + '&depto=' + depto + '&localidad=' + localidadId);
                    for (const m of mData) {
                        const ks = ['d_prestador', 'c_prestador', 'c_paquete', 'd_bate', 'direccion', 'depto', 'localidad',
                            'cant_loc', 'cant_prest', 'cant_depto', 'cupo'];
                        helpers.run(db, 'insert into medico (provincia_id, depto_id, localidad_id,' +
                            ks.join(",") + ')' +
                            ' VALUES (?,?,?,' + ks.map(x => '?').join(',') + ')',
                            [pId, dId, lId, ...ks.map(x => m[x.toUpperCase()])]);
                    }
                }
            }
        }
    } catch (err) {
        console.error("ERROR", err);
    } finally {
        db.close();
    }
}

main().catch(err => console.error("Error", err));