const fs = require('fs')
    , server = require('./server')
    , monfs = require('./monfs');

var options = {
    fs: { },
    ftpd: { },
};

try {
    var config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

    if (config.fs === undefined && (config.zm)) {
        config.fs = config.zm;
        delete config.zm;
    }

    Object.assign(options, config);
} catch (ex) {
  //  No problem, we have defaults and we'll just create this file later
}

var myfs = new monfs(options.fs);
var ftpd = new server(options.ftpd, myfs.fs);

options.ftpd = ftpd.settings;
options.fs = myfs.settings;
fs.writeFile('config.json', JSON.stringify(options, null, ' '), (err) => {
    if (err) throw err;
});

myfs.on('config:change', () => {
    console.log('Config file changed, writing new file');
    options.fs = myfs.settings;
    fs.writeFile('config.json', JSON.stringify(options, null, ' '), (err) => {
        if (err) throw err;
    });
});

ftpd.listen();
