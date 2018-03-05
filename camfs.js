const memfs = require('memfs');

module.exports = class camfs {
    constructor() {
        var json = {
            '/motion/' : { },
        };
        this.camfs = memfs.Volume.fromJSON(json);
    }

    get fs() {
        return this.camfs;
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
            camfs.readdirSync(folderPath)
            .forEach((file) => {
                let path = `${folderPath}/${file}`;
                let lastModification = camfs.statSync(path).mtimeMs;
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
