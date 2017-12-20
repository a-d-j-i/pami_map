var request = require('request');
var cheerio = require('cheerio');
var Geocoder = require("batch-geocoder");
var fs = require('fs');
var http = require('http');

request.post('http://www.pami.org.ar/_cargar_medicos.php',
        {
            form: {"prov": "CAPITAL FEDERAL", "depto": "CAPITAL FEDERAL", "localidad": "10010019"}
        },
        function (error, response, body) {
            console.log('error:', error);
            console.log('statusCode:', response && response.statusCode);
            //console.log('body:', body);
            // come on!!!
            var html = eval(body);
            if (!error && response.statusCode === 200) {
                var $ = cheerio.load(html);
                //console.log($.html());
                var geo_data = {};
                var geo = [];
                //console.log("name\taddress\tcity");
                $('div[class=pagination__item]').each(function (i, element) {
                    //console.log(i + " : " + $(this).html());
                    var cupo = $("div[class=respuesta_cupo]", this).children("img").attr('title');
                    if (!cupo.includes("Cupo no disponible.")) {
                        var d = $("div[class=cabecera_dir]", this).html().replace(/\r|\n|\t/g, '').split("-");
                        var dire = d[0] + "," + d[1];
                        var name = $("div[class=contenedor_prest]", this).html();
                        geo_data[dire] = {
                            name: name,
                            address: d[0],
                            city: d[1],
                            dire: dire
                        };
                        geo.push(dire);
                    }
                });
                var geocoder = new Geocoder("geocode-cache.csv");
                geocoder.on("finish", function (collection) {
                    var medicos = [];
                    for (var dire in collection) {
                        var d = geo_data[dire];
                        d.geo = collection[dire];
                        medicos.push({
                            position: d.geo,
                            title: d.name,
                            address: d.address
                        });
                    }
                    var data = fs.readFileSync(__dirname + '/map.html', 'utf8');
                    data = data.replace("\"{{MAP_DATA}}\"", JSON.stringify(medicos));
                    data = data.replace("{{GOOGLE_MAP_API_KEY}}", "PUT_YOUR_GOOGLE_MAP_API_KEY_HERE!!!"));
                    fs.writeFile(__dirname + '/map_out.html', data, function (err) {
                        if (err)
                            throw err;
                        console.log('complete');
                    });
                });
                geocoder.on("status", function (status) {
                    console.log(status.current + '/' + status.total);
                });
                geocoder.find(geo);
            }
        });
