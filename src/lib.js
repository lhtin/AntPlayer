const fs = require('fs');
const path = require('path');
const {Menu, MenuItem, dialog} = require('electron').remote;
const parse = require('./parser').parse;

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
            if (r.length > 1000) {
                r = r.slice(-1000);
            }
            store(key, r);
        },
        get: () => {
            return Array.from(r).reverse().slice(0, 10);
        }
    }
})();
let videoRegExp = /\.(?:mp4|webm)$/;
let isVideoFile = (filename) => {
    return videoRegExp.test(filename);
};
let log = (err) => {
    document.body.innerHTML = err.toString();
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
                div.innerHTML = `${item.filename} : ${item.currentTime}s`;
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
    selectDir: (cb) => {
        dialog.showOpenDialog({
            title: '选择目录',
            defaultPath: '~',
            properties: ['openDirectory']
        }, (paths) => {
            if (paths) {
                cb(false, paths[0]);
            } else {
                cb(new Error('没有选择目录'));
            }
        });
    },
    selectSub: (cb) => {
        dialog.showOpenDialog({
            title: '选择字幕文件',
            defaultPath: '~',
            properties: ['openFile'],
            filters: [
                {name: 'Subtitle', extensions: ['vtt']},
            ]
        }, (paths) => {
            if (paths) {
                cb(false, paths[0]);
            } else {
                cb(new Error('没有选择字幕文件'));
            }
        });
    },
    getFiles: (dir, cb) => {
        fs.readdir(dir, (err, files) => {
            if (err) {
                return log(err);
            }
            let list = [];
            let dirList = []; // dirs
            let fileList = []; // video files

            let check = (() => {
                let length = files.length;
                let count = 0;
                return (err) => {
                    if (count === -1) {
                        return;
                    }
                    if (err) {
                        log(err);
                        count = -1;
                    }
                    count += 1;
                    if (count >= length) {
                        cb(list.concat(
                            fileList.sort((a, b) => a.filename.localeCompare(b.filename, undefined, {
                                numeric: true
                            })),
                            dirList.sort((a, b) => a.filename.localeCompare(b.filename, undefined, {
                                numeric: true
                            }))))
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
                fs.stat(item.path, (err, stats) => {
                    if (err) {
                        return check(err);
                    } else if (file.indexOf('.') === 0) {
                        // 去掉文件开头为.的文件和目录
                    } else if (stats.isFile()) {
                        item.type = 'file';
                        if (isVideoFile(file)) {
                            let record_time = record.find(item.path);
                            item.currentTime = record_time ? record_time.currentTime : 0;
                            fileList.push(item);
                        }
                    } else if (stats.isDirectory()) {
                        item.type = 'dir';
                        dirList.push(item);
                    }
                    check();
                });
            }
        })
    },
    makeVideo: (item) => {
        let loadedmetadata = false;
        let frag = document.createDocumentFragment();
        let video = document.createElement('video');
        let playground = document.getElementById('playground');
        let subtitle = document.getElementById('subtitle')
        frag.appendChild(video);
        video.addEventListener('canplay', function () {
            let height = video.videoHeight;
            if (height > 500) {
                height = 500;
            }
            video.height = height;
            video.width = height / video.videoHeight * video.videoWidth;
            video.style.height = video.height + 'px';
            video.style.width = video.width + 'px';
            playground.style.width = video.width + 'px';
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

        let subtitlePath = item.path.replace(videoRegExp, '.vtt');
        fs.stat(subtitlePath, (err, stats) => {
            if (err) {

            } else if (stats.isFile()) {
                api.replaceSubtitle(subtitlePath);
            }
        });

        let sub;
        let subAt = 0;
        let findCue = (t) => {
            if (!sub) {
                return '';
            }
            let cues = sub.cues;
            let cue = cues[subAt];
            let len = sub.cues.length;
            if (cue.start > t) {
                if (subAt <= 0) {
                    return '';
                } else if (cues[subAt - 1].end < t) {
                    return '';
                } else {
                    subAt -= 1;
                    return findCue(t);
                }
            } else if (cue.end < t) {
                if (subAt >= len - 1) {
                    return '';
                } else if (cues[subAt + 1].start > t) {
                    return '';
                } else {
                    subAt += 1;
                    return findCue(t);
                }
            } else {
                return cue.text;
            }
        };
        let lastCue;
        video.addEventListener('timeupdate', () => {
            let cue = findCue(video.currentTime);
            if (lastCue !== cue) {
                lastCue = cue;
                subtitle.innerHTML = `Subtitle: ${cue.replace(/(\b\w+\b)/g, '<span class="word">$1</span>')}`;
            }
        });
        let api = {
            appendTo: function (box) {
                box.appendChild(frag);
            },
            destroy: function () {
                video.pause();
                frag.parentNode && frag.parentNode.removeChild(frag);
            },
            pause: () => {
                video.pause();
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
            replaceSubtitle: (path) => {
                fs.readFile(path, 'utf8', (err, data) => {
                    if (err) {
                        return;
                    }
                    let res = parse(data);
                    if (res.valid) {
                        sub = res;
                        subAt = 0;
                    }
                });
            }
        };
        return api;
    }
};