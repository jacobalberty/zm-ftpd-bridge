const fs = require('fs')
    , path = require('path')
    , ftpd = require('ftpd')
    , monfs = require('./monfs');

var keyFile;
var certFile;
var server;
var options = {
    zm: { },
    ftpd: {
        host: process.env.IP || '127.0.0.1',
        port: process.env.PORT || 7002,
        tls: null,
    },

};
try {
    var config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

    Object.assign(options, config);
} catch (ex) {
  //  No problem, we have defaults and we'll just create this file later
}

if (process.env.KEY_FILE && process.env.CERT_FILE) {
  console.log('Running as FTPS server');
  if (process.env.KEY_FILE.charAt(0) !== '/') {
    keyFile = path.join(__dirname, process.env.KEY_FILE);
  }
  if (process.env.CERT_FILE.charAt(0) !== '/') {
    certFile = path.join(__dirname, process.env.CERT_FILE);
  }
  options.ftpd.tls = {
    key: fs.readFileSync(keyFile),
    cert: fs.readFileSync(certFile),
    ca: !process.env.CA_FILES ? null : process.env.CA_FILES
      .split(':')
      .map(function(f) {
        return fs.readFileSync(f);
      }),
  };
} else {
  console.log();
  console.log('*** To run as FTPS server,                 ***');
  console.log('***  set "KEY_FILE", "CERT_FILE"           ***');
  console.log('***  and (optionally) "CA_FILES" env vars. ***');
  console.log();
}

server = new ftpd.FtpServer(options.ftpd.host, {
  getInitialCwd: function() {
    return '/';
  },
  getRoot: function() {
    return '/';
  },
  pasvPortRangeStart: 1025,
  pasvPortRangeEnd: 1050,
  tlsOptions: options.ftpd.tls,
  allowUnauthorizedTls: true,
  useWriteFile: false,
  useReadFile: true,
  uploadMaxSlurpSize: 7000, // N/A unless 'useWriteFile' is true.
});

server.on('error', function(error) {
  console.log('FTP Server error:', error);
});

var myfs = new monfs(options.zm);

setInterval(function() {
    options.zm = myfs.settings
    fs.writeFile('config.json', JSON.stringify(options, null, ' '), (err) => {
        if (err) throw err;
    });
}, 15000);

server.on('client:connected', function(connection) {
  var username = null;
  console.log('client connected: ' + connection.remoteAddress);
  connection.on('command:user', function(user, success, failure) {
    if (user) {
      username = user;
      success();
    } else {
      failure();
    }
  });

  connection.on('command:pass', function(pass, success, failure) {
    if (pass) {
      success(username, myfs.fs);
    } else {
      failure();
    }
  });
});

server.debugging = 0;
server.listen(options.ftpd.port);
console.log('Listening on port ' + options.ftpd.port);
