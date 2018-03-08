'use strict';
const ftpd = require('ftpd');

module.exports = class Server {

    constructor(options, mfs = fs) {
        var defopts = {
            host: process.env.IP || '127.0.0.1',
            port: process.env.PORT || 7002,
        };
        this._options = Object.assign(defopts, options)

        this._server = new ftpd.FtpServer(options.host, {
          getInitialCwd: function() {
            return '/';
          },
          getRoot: function() {
            return '/';
          },
          pasvPortRangeStart: 1025,
          pasvPortRangeEnd: 1050,
          useWriteFile: false,
          useReadFile: true,
          uploadMaxSlurpSize: 7000, // N/A unless 'useWriteFile' is true.
        });

        this._server.on('error', function(error) {
          console.log('FTP Server error:', error);
        });

        this._server.on('client:connected', function(connection) {
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
              success(username, mfs);
            } else {
              failure();
            }
          });
        });

        this._server.debugging = 0;
    }

    listen() {
        this._server.listen(this._options.port);
    }

    get settings() {
        return this._options;
    }
}
