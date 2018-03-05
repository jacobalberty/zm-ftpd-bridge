const memfs = require('memfs')
    , net = require('net')
    , path = require('path');

module.exports = class monfs {
    constructor(options) {
        var opts ={
            host: '127.0.0.1', // ZMTrigger host
            port: 6802, // ZMTrigger port
            interval: 30, // record for 30 seconds at a time
        };
        var json = {
            '/motion/' : { },
        };
        this._fs = memfs.Volume.fromJSON(json);

        Object.assign(opts, options);
        this._interval = opts.interval;
        this._zmhost = opts.host;
        this._zmport = opts.port;

        this._watch('/motion', function(eventType, filename) {
            if (eventType === 'rename') {
                var mid = parseInt(path.basename(filename));
                if (!isNaN(mid))
                    this._watchMonitor(mid, false);
            }
        }.bind(this));
    }

    get fs() {
        return this._fs;
    }

    _watchMonitor(mid, mkdir = true) {
        var path=`/motion/${mid}`
        console.log(`monitoring ${path}`);
        var monfun = function(err) {
            if (err)
                return;
            this._watch(path, function(eventType, filename) {
                var tcmd = `${mid}|on+${this._interval}|1|External Motion|External Motion`
                console.log(tcmd);
                /**
                 * TODO list
                 * ? use on and settimeout to cancel the event after this._interval, then every time there's an upload reset settimeout
                 */
                var client = new net.Socket();
                client.on('error', function(err) {
                    console.log(`Error connecting to ZMTrigger server: ${err}`);
                } );
                client.connect(this._zmport, this._zmhost, function() {
                    //console.log('Connected');
                    client.write(tcmd);
                    client.destroy();
                });
                this._fs.unlink(filename, function(){});
            }.bind(this));
        }.bind(this);
        if (mkdir)
            this._fs.mkdir(path,monfun);
        else
            monfun();
    }

    // memfs.fs.watch seems more geared to watching specific files, not entire folders so this provides our watch functionality
    _watch(path, options, listener) {
        if (typeof options === 'function') {
            listener = options;
            options = null;
        }
        const folderPath = path;
        const pollInterval = 300;
        let folderItems = {};
        setInterval(() => {
            this._fs.readdirSync(folderPath)
            .forEach((file) => {
                let path = `${folderPath}/${file}`;
                let lastModification = this._fs.statSync(path).mtimeMs;
                if (!folderItems[file]) {
                    folderItems[file] = lastModification;
                    listener('rename', path);
                } else if (folderItems[file] !== lastModification) {
                    folderItems[file] = lastModification;
                    listener('change', path);
                }
            });
        }, pollInterval);
    }
}
