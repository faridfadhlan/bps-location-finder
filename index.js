const axios = require('axios').default;
const fs = require('fs');
const moment = require('moment');
const csv = require('csvtojson');
const path = require('path');
const { createLogger, format, transports, config } = require('winston');
const { combine, timestamp, printf } = format;


const now = moment().format('YYYYMMDDHHmmss');
const regex = /(\-?\d+(\.\d+)?),\s*(\-?\d+(\.\d+)?)/g;
const outputfile = path.join('output', now+'.csv');
const inputfilename = 'bps.csv';
const header = ["kode","nama_kantor","koordinat"];

const myformat = printf(({ level, message }) => {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss')
    return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
    levels: config.npm.levels,
    format: combine(
      format.colorize(),
      timestamp(),
      myformat
    ),
    transports: [
        new transports.Console()
    ]
});

if(!fs.existsSync('output')) {
    fs.mkdirSync('output');
}

const ow = fs.createWriteStream(outputfile, {
    flags: 'a'
})

const generate_url = (name) => {
    return `https://www.google.com/search?tbm=map&authuser=0&hl=en&gl=id&pb=!4m9!1m3!1d12468.178272757299!2d109.3259524!3d-0.0457705!2m0!3m2!1i1366!2i150!4f13.1!7i20!10b1!12m8!1m1!18b1!2m3!5m1!6e2!20e3!10b1!16b1!19m4!2m3!1i360!2i120!4i8!20m57!2m2!1i203!2i100!3m2!2i4!5b1!6m6!1m2!1i86!2i86!1m2!1i408!2i240!7m42!1m3!1e1!2b0!3e3!1m3!1e2!2b1!3e2!1m3!1e2!2b0!3e3!1m3!1e3!2b0!3e3!1m3!1e8!2b0!3e3!1m3!1e3!2b1!3e2!1m3!1e9!2b1!3e2!1m3!1e10!2b0!3e3!1m3!1e10!2b1!3e2!1m3!1e10!2b0!3e4!2b1!4b1!9b0!22m6!1sx3t1Xqy-FpmS9QOt87b4AQ%3A1!2s1i%3A0%2Ct%3A11886%2Cp%3Ax3t1Xqy-FpmS9QOt87b4AQ%3A1!7e81!12e5!17sx3t1Xqy-FpmS9QOt87b4AQ%3A39!18e15!24m46!1m12!13m6!2b1!3b1!4b1!6i1!8b1!9b1!18m4!3b1!4b1!5b1!6b1!2b1!5m5!2b1!3b1!5b1!6b1!7b1!10m1!8e3!14m1!3b1!17b1!20m2!1e3!1e6!24b1!25b1!26b1!30m1!2b1!36b1!43b1!52b1!55b1!56m2!1b1!3b1!65m5!3m4!1m3!1m2!1i224!2i298!26m4!2m3!1i80!2i92!4i8!30m0!34m9!3b1!4b1!6b1!8m1!1b1!9b1!12b1!14b1!20b1!37m1!1e81!42b1!47m0!49m1!3b1!50m3!2e2!3m1!1b1!65m0&q=${name}&oq=${name}&gs_l=maps.3..38l5.31065.37605.1.41298.41.40.0.0.0.0.236.3380.22j12j1.39.0....0...1ac.1.64.maps..2.35.3379.0..38i69k1j38i377k1j38i376k1j38i72k1.82.&tch=1&ech=1&psi=x3t1Xqy-FpmS9QOt87b4AQ.1584757701227.1`;
}

const getData = (url) => {    
    return axios.get(url, { responseType: 'text' });
}

(async () => {
    const bps = await csv().fromFile(inputfilename);
    await ow.write(header.join(";")+"\n")
    const total = bps.length;
    for(i in bps) {
        const n = bps[i];
        const url = generate_url(encodeURI(n.keyword));
        try {
            let found = false;
            logger.info("Processing " + n.nama + ' - ' + (parseInt(i)+1) + "/" + total + "...");
            logger.info("Searching " + n.keyword + '...');
            const response = await getData(url);
            const match = response.data.match(regex);
            if(match != null) {
                logger.info("Found! Processing data...");
                
                for(m of match) {
                    const pecah = m.split(',');
                    const lat = pecah[0].split('.');
                    const long = pecah[1].split('.');
                    if(lat.length > 1 && long.length > 1) {
                        if(lat[1].length > 5 && long[1].length > 5) {
                            await ow.write(n.kodeprov + n.kodekab +';' + n.keyword + ';' + m + "\n");
                            logger.info("Yay, Koordinat berhasil ditemukan!");
                            found = true;
                            break;
                        }
                    }
                }

                if(!found) {
                    logger.error("Not Found!");
                    await ow.write(n.kodeprov + n.kodekab +';' + n.keyword + ';Not Found\n');
                    await ow.write(n +';Not Found\n');
                }
            }
            else {
                logger.error("Not Found!");
                await ow.write(n.kodeprov + n.kodekab +';' + n.keyword + ';Not Found\n');
            }
        }
        catch(err) {
            logger.error(err);
            await ow.write(n.kodeprov + n.kodekab +';' + n.keyword + ';Not Found\n');
        }
    }
    
})();