const helpers = require('./helpers');
const sqlite3 = require('sqlite3');
const fetch = require("node-fetch");


async function geosearch(q, limit = "1") {
    const params = new URLSearchParams({
        q,
        limit,
        format: "json"
    });
    const ENDPOINT = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
    const payload = await fetch(ENDPOINT).then(res => res.json());
    if (!payload || !payload.length) {
        console.error(`No response for Address: ${q}`);
        return undefined;
    }
    return payload;
};


async function geolocate(attempt, db, element, dire, timeout = 10000) {
    const replacements = [
        ['ALMTE', 'ALMIRANTE'],
        ['AVDA.', 'AVENIDA'],
        ['CNEL', 'CORONEL'],
        ['GRAL', 'GENERAL'],
        ['CMDTE', 'COMANDANTE'],
        ['CNIA.', ''],
        ['NVA.', ''],
        [/\(PDO.(.*)\)/, ''],
        ['SALIQUELLO', 'SALLIQUELO'],
        ['MAQUINISTA FRANCISCO SAVIO', 'MAQUINISTA SAVIO'],
        ['R. SAENZ PEÑA', 'ROQUE SAENZ PEÑA'],
        [' S.F.D.V.D.', ''],
        ['S.A.D.F.M.','']
    ];
    console.log('pre', dire);
    dire = replacements.reduce((acc, val) =>
        acc.replace(val[0], val[1]), dire);
    console.log('pos', dire);


    console.log("Searching", dire, "for", element['d_prestador']);
    const dbRes = await helpers.select(db, "SELECT * from geolocation where dire = ?", dire);
    let val;
    if (dbRes.length > 0) {
        val = [dbRes[0]['lat'], dbRes[0]['lon']];
    } else {
        try {
            const geoRes = await geosearch(dire);
            if (geoRes) {
                val = [geoRes[0].lat, geoRes[0].lon];
            }
        } catch (err) {
            console.error("REQUEST ERROR", err);
            await helpers.sleep(timeout);
            await geolocate(attempt, db, element, dire, timeout + 10000)
            return;
        }
    }
    if (val) {
        console.log("Found", dire, "for", element['d_prestador'], ":", val);
        const gRet = await helpers.run(db, 'INSERT INTO geolocation(attempt, dire, direccion, depto, localidad, lat, lon) VALUES (?,?,?,?,?,?,?)',
            [attempt, dire, element['direccion'], element['depto'], element['localidad'], ...val]);
        return await helpers.run(db, 'INSERT INTO medicoXgeo(medico_id, geo_id) VALUES (?,?)', [element['id'], gRet.lastID]);
    }
}

async function main() {
    // open the database connection
    let db = new sqlite3.Database('./collect.db');
    try {
        if (false) {
            console.log(await helpers.run(db, 'DROP TABLE IF EXISTS geolocation;'));
            console.log(await helpers.run(db, 'DROP  TABLE IF EXISTS medicoXgeo;'));
        }
        console.log(await helpers.run(db, 'CREATE TABLE IF NOT EXISTS geolocation(id INTEGER PRIMARY KEY, ' +
            'attempt INTEGER NOT NULL, ' +
            'dire TEXT NOT NULL, ' +
            'direccion TEXT NOT NULL,' +
            'depto TEXT NOT NULL,' +
            'localidad TEXT NOT NULL,' +
            'lat TEXT NOT NULL, lon TEXT NOT NULL );'));
        console.log(await helpers.run(db, 'CREATE TABLE IF NOT EXISTS medicoXgeo(medico_id INTEGER , geo_id INTEGER, UNIQUE(medico_id,geo_id));'));
        //
        const elements = await helpers.select(db, "select * from medico a where not exists (select id from medicoXgeo b where a.id = b.medico_id);", []);
        for (let element of elements) {
            let res;
            if (!res) {
                res = await geolocate(1, db, element, element['direccion'] + ', ' + element['depto'] + ', ' + element['localidad'] + ', ARGENTINA');
            }
            if (!res) {
                res = await geolocate(11, db, element, element['direccion'] + ', ' + element['localidad'] + ', ' + element['depto'] + ', ARGENTINA');
            }

            if (!res) {
                res = await geolocate(2, db, element, element['depto'] + ', ' + element['localidad'] + ', ARGENTINA');
            }
            if (!res) {
                res = await geolocate(12, db, element, element['localidad'] + ', ' + element['depto'] + ', ARGENTINA');
            }

            if (!res) {
                res = await geolocate(3, db, element, element['localidad'] + ', ARGENTINA');
            }
            if (!res) {
                res = await geolocate(13, db, element, element['depto'] + ', ARGENTINA');
            }
        }
    } catch (err) {
        console.error("ERROR", err);
    } finally {
        db.close();
    }
}

main().catch(err => console.error("Error", err));