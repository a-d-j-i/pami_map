const helpers = require('./helpers');
const sqlite3 = require('sqlite3');
const fs = require('fs');

async function main() {
    const googleKey = await helpers.ask('Google maps key:');
    if (!googleKey) {
        console.error("invalid key");
        return;
    }

    let db = new sqlite3.Database('./collect.db');
    let medicos;
    try {
        const elements = await helpers.select(db, "select * from medico a, medicoXgeo b, geolocation c where a.id = b.medico_id and b.geo_id = c.id;");
        medicos = elements.map(x => ({
            position: {lat: parseFloat(x['lat']), lng: parseFloat(x['lon'])},
            title: x['d_prestador'],
            code: x['c_prestador'],
            direccion: x['direccion'],
            depto: x['depto'],
            localidad: x['localidad'],
            cupo: x['cupo'],
        }));
    } catch (err) {
        console.error("ERROR", err);
    } finally {
        db.close();
    }
    let data = fs.readFileSync(__dirname + '/map.html', 'utf8');
    data = data.replace("\"{{MAP_DATA}}\"", JSON.stringify(medicos));
    data = data.replace("{{GOOGLE_MAP_API_KEY}}", googleKey);
    fs.writeFile(__dirname + '/map_out.html', data, function (err) {
        if (err)
            throw err;
        console.log('complete');
    });
}

main().catch(err => console.error("Error", err));