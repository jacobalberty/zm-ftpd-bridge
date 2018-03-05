const memfs = require('memfs');

module.exports = class camfs {
    constructor() {
        var json = {
            '/motion/' : { },
        };
        this._fs = memfs.Volume.fromJSON(json);
    }

    get fs() {
        return this._fs;
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
