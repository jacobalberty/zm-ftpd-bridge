const memfs = require('memfs')
    , path = require('path');

module.exports = class monfs {
    constructor() {
        var json = {
            '/motion/' : { },
        };
        this._fs = memfs.Volume.fromJSON(json);
        this._interval = 30; // Record for 30 seconds
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
                 * * connect to zoneminder port 6802 and send tcmd
                 * * use on and settimeout to cancel the event after this._interval, then every time there's an upload reset settimeout
                 */
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
