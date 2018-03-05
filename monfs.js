const memfs = require('memfs');

module.exports = class monfs {
    constructor() {
        var json = {
            '/motion/' : { },
        };
        this._fs = memfs.Volume.fromJSON(json);
        this._interval = 30; // Record for 30 seconds
    }

    get fs() {
        return this._fs;
    }

    _watchCamera(cam) {
        var path=`/motion/cam${cam}`
        this._fs.mkdir(path,function(err) {
            if (err)
                return;
            this._watch(path, function(eventType, filename) {
                var tcmd = `${cam}|on+${this._interval}|${cam}|External Motion|External Motion`
                console.log(tcmd);
                // connect to zoneminder port 6802 and send tcmd
                this._fs.unlink(filename, function(){});
            }.bind(this));
        }.bind(this));
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
