const fs = require('fs');
const path = require('path');
const {dialog} = require('electron').remote;

let store = (key, obj) => {
    localStorage.setItem(key, JSON.stringify(obj));
};
let find = (key) => {
    let str = localStorage.getItem(key);
    try {
        return JSON.parse(str);
    } catch (e) {
        return str;
    }
};
let remove = (key) => {
    localStorage.removeItem(key);
};
let record = (() => {
    let item = {
        type: '',
        filename: '',
        path: '',
        dir: '',
        currentTime: 0
    };

    let key = 'history';
    let r = find(key) || [];
    return {
        destroy: () => {
            r = [];
            store(key, r);
        },
        find: (path) => {
            let res = r.filter((item) => {
                return item.path === path
            });
            return res.length > 0 ? res[0] : false;
        },
        push: (item) => {
            let i = r.findIndex((_item) => {
                return _item.path === item.path;
            });
            if (i > -1) {
                r.splice(i, 1);
            }
            r.push(item);
            if (r.length > 10) {
                r = r.slice(-10);
            }
            store(key, r);
        },
        get: () => {
            return Array.from(r).reverse();
        }
    }
})();
let videoRegExp = /\.(?:mp4|webm)$/;
let isVideoFile = (filename) => {
    return videoRegExp.test(filename);
};
module.exports = {
    store: store,
    find: find,
    remove: remove,

    record: record,
    makeList: (list) => {
        let frag = document.createDocumentFragment();
        for (let item of list) {
            let div = document.createElement('div');
            div.ant = item;
            div.className = item.type;
            if (typeof item.currentTime === 'number') {
                div.innerHTML = `${item.filename} : ${item.currentTime.toFixed(1)}s`;
            } else {
                div.innerHTML = `${item.filename}`;
            }
            frag.appendChild(div);
        }
        return frag;
    },
    step: (f) => {
        let flag = false;
        return (e) => {
            if (flag) {
                return;
            }
            flag = true;
            f(e, () => {
                flag = false;
            });
        }
    },
    isVideoFile: isVideoFile,
    selectDir: (cb) => {
        let paths = dialog.showOpenDialog({
            title: '选择目录',
            defaultPath: '~',
            properties: ['openDirectory']
        }, (paths) => {
            if (paths) {
                cb(false, paths[0]);
            } else {
                cb(true);
            }
        });
    },
    getFiles: (dir, cb) => {
        fs.readdir(dir, cb)
    },
    makeFileList: (dir, files, cb) => {
        let list = [];
        let dirList = [];
        let fileList = [];

        let check = (() => {
            let length = files.length;
            let count = 0;
            return (err) => {
                if (count === -1) {
                    return;
                }
                if (err) {
                    cb(err);
                    count = -1;
                }
                count += 1;
                if (count >= length) {
                    cb(false, list.concat(fileList, dirList))
                }
            }
        })();

        // 上一层目录
        list.push({
            dir: dir,
            filename: '..',
            path: path.join(dir, '..'),
            type: 'dir'
        });
        for (let file of files) {
            let item = {
                dir: dir,
                filename: file,
                path: path.join(dir, file),
                type: 'unknown'
            };
            let stats = fs.stat(item.path, (err, stats) => {
                if (err) {
                    check(err);
                } else if (stats.isFile()) {
                    item.type = 'file';
                    if (file.indexOf('.') !== 0 && videoRegExp.test(file)) {
                        let ritem = record.find(item.path);
                        item.currentTime = ritem ? ritem.currentTime : 0;
                        fileList.push(item);
                    }
                } else if (stats.isDirectory()) {
                    item.type = 'dir';
                    if (file.indexOf('.') !== 0) {
                        dirList.push(item);
                    }
                }
                check();
            });
        }
    },
    makeVideo: (item) => {
        let loadedmetadata = false;
        let video = document.createElement('video');
        video.addEventListener('canplay', function () {
            let height = video.videoHeight;
            if (height > 500) {
                height = 500;
            }
            video.height = height + 220;
            video.width = height / video.videoHeight * video.videoWidth;
            video.style.height = video.height + 'px';
            video.style.width = video.width + 'px';
        });
        video.addEventListener('loadedmetadata', function () {
            loadedmetadata = true;
            video.currentTime = item.currentTime;
        });
        video.addEventListener('timeupdate', function () {
            item.currentTime = video.currentTime;
            record.push(item);
        });
        video.setAttribute('src', item.path);
        video.setAttribute('controls', 'true');
        video.setAttribute('autoplay', 'true');

        let setSubtitle = (path) => {
            let subtitle = document.createElement('track');
            subtitle.setAttribute('default', 'true');
            subtitle.setAttribute('kind', 'subtitles');
            subtitle.setAttribute('src', path);
            video.appendChild(subtitle);
        };

        let subtitlePath = item.path.replace(videoRegExp, '.vtt');
        fs.stat(subtitlePath, (err, stats) => {
            if (err) {

            } else if (stats.isFile()) {
                setSubtitle(subtitlePath);
            }
        });
        return {
            appendTo: function (box) {
                box.appendChild(video);
            },
            destroy: function () {
                video.pause();
                video.parentNode && video.parentNode.removeChild(video);
            },
            toggle: function () {
                if (video.paused) {
                    video.play();
                } else {
                    video.pause();
                }
            },
            prev: function () {
                if (loadedmetadata) {
                    video.currentTime -= 5;
                }
            },
            next: function () {
                if (loadedmetadata) {
                    video.currentTime += 5;
                }
            },
            setSubtitle: setSubtitle
        }
    }
};