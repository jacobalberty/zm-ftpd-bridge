const EventEmitter = require('events')
    , memfs = require('memfs')
    , net = require('net')
    , path = require('path');

module.exports = class monfs extends EventEmitter {
    constructor(options) {
        super();
        var opts ={
            host: '127.0.0.1', // ZMTrigger host
            port: 6802, // ZMTrigger port
            interval: 30, // record for 30 seconds at a time
            monitors: { },
        };
        var json = {
            '/motion/' : { },
        };

        this._settings = Object.assign(opts, options);

        Object.keys(opts.monitors).forEach((key) => {
            json[`/motion/${key}.json`] = JSON.stringify(opts.monitors[key], null, ' ');
            json[`/motion/${key}`] = { };
        });

        this._fs = memfs.Volume.fromJSON(json);
        this._fs.readdir('/motion', (err, files) => {
            if (err)
                return;
            files.forEach((file) => {
                this._fs.stat(`/motion/${file}`, (err, stats) => {
                    if (err) throw err;
                    if (stats.isDirectory()) {
                        var mid = parseInt(file);
                        if (!isNaN(mid))
                            this._watchMonitor(mid, false);
                    }
                });
            });
        });
        this._watch('/motion', function(eventType, filename) {
            var stats = this._fs.stat(filename, (err, stats) => {
                if (path.extname(filename) === '.json') {
                    var mid = parseInt(path.basename(filename, '.json'));
                    if (!isNaN(mid)) {
                        this._settings.monitors[mid] = JSON.parse(this._fs.readFileSync(filename, 'utf-8'));
                        if (this._settings.monitors[mid].mid === undefined) this._settings.monitors[mid].mid = mid;
                        this.emit('config:change');
                    }
                }
                if (eventType === 'rename' && stats.isDirectory()) {
                    var mid = parseInt(path.basename(filename));
                    if (!isNaN(mid))
                        this._watchMonitor(mid, false);
                }
            });
        }.bind(this));
    }

    get fs() {
        return this._fs;
    }

    get settings() {
        return this._settings;
    }

    monSettings(mid) {
        var setClone = Object.assign({}, this._settings);
        delete setClone.monitors;
        return Object.assign({}, setClone, this._settings.monitors[mid]);
    }

    _watchMonitor(mid, mkdir = true) {
        var path=`/motion/${mid}`
        console.log(`monitoring ${path}`);
        var monfun = function(err) {
            if (err)
                return;
            this._watch(path, {recursive: true}, function(eventType, filename) {
                var settings = this.monSettings(mid);
                if (settings.mid === undefined) {
                    settings.mid = mid;
                }
               this._startEvent(mid, settings);
                setTimeout(function(){this._fs.unlink(filename, function(){})}.bind(this), 5000);
            }.bind(this));
        }.bind(this);
        if (mkdir)
            this._fs.mkdir(path,monfun);
        else
            monfun();
    }

    _startEvent(key, settings) {
        switch (settings.type) {
            case 'test':
                console.log(JSON.stringify(settings, null, ' '));
                break;
            case 'zmtrigger':
            default:
                var tcmd = `${settings.mid}|on+${settings.interval}|1|External Motion|External Motion`

                /**
                 * TODO list
                 * ? use on and settimeout to cancel the event after settings.interval, then every time there's an upload reset settimeout
                 */
                var client = new net.Socket();
                client.on('error', function(err) {
                    console.log(`Error connecting to ZMTrigger server: ${err}`);
                } );
                client.connect(settings.port, settings.host, function() {
                    //console.log('Connected');
                    client.write(tcmd);
                    client.destroy();
                });
        }
    }

    // memfs.fs.watch seems more geared to watching specific files, not entire folders so this provides our watch functionality
    _watch(path, options, listener) {
        if (typeof options === 'function') {
            listener = options;
            options = { };
        }
        const folderPath = path;
        const pollInterval = 300;
        let folderItems = {};
        this._fs.readdir(folderPath, (err, files) => {
            if (err)
                return;
            files.forEach((file) => {
                let path = `${folderPath}/${file}`;
                this._fs.stat(path, (err, stats) => {
                    if (stats === undefined)
                        console.log(err);
                    let lastModification = stats.mtimeMs;
                    if (stats.isFile() || !options.recursive === true ) {
                        if (!folderItems[file]) {
                            folderItems[file] = lastModification;
                        } else if (folderItems[file] !== lastModification) {
                            folderItems[file] = lastModification;
                        }
                    } else if (options.recursive === true && stats.isDirectory() && folderItems[file] !== lastModification) {
                        folderItems[file] = lastModification;
                        this._watch(path, options, listener)
                    }
                });
            });
        });
        setInterval(() => {
            this._fs.readdir(folderPath, (err, files) => {
                if (err)
                    return;
                files.forEach((file) => {
                    let path = `${folderPath}/${file}`;
                    this._fs.stat(path, (err, stats) => {
                        if (stats === undefined)
                            console.log(err);
                        let lastModification = stats.mtimeMs;
                        if (stats.isFile() || !options.recursive === true ) {
                            if (!folderItems[file]) {
                                folderItems[file] = lastModification;
                                listener('rename', path);
                            } else if (folderItems[file] !== lastModification) {
                                folderItems[file] = lastModification;
                                listener('change', path);
                            }
                        } else if (options.recursive === true && stats.isDirectory() && folderItems[file] !== lastModification) {
                            folderItems[file] = lastModification;
                            this._watch(path, options, listener)
                        }
                    });
                });
            });
        }, pollInterval);
    }
}
