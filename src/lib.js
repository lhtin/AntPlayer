const fs = require('fs');
const path = require('path');
const {dialog} = require('electron').remote;

let storage = (() => {
    let videos = localStorage.getItem('videos');
    videos = (videos ? JSON.parse(videos) : Object.create(null));
    return (id, time) => {
        if (typeof time === 'number') {
            videos[id] = time;
            localStorage.setItem('videos', JSON.stringify(videos));
        } else {
            return videos[id];
        }
    }
})();
let re = /\.(?:mp4|webm)$/;
module.exports = {
    re: re,
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
            name: '..',
            path: path.join(dir, '..'),
            type: 'dir'
        });
        for (let file of files) {
            let item = {
                dir: dir,
                name: file,
                path: path.join(dir, file),
                type: 'unknown'
            };
            let stats = fs.stat(item.path, (err, stats) => {
                if (err) {
                    check(err);
                } else if (stats.isFile()) {
                    item.type = 'file';
                    if (file.indexOf('.') !== 0 && re.test(file)) {
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
    makeVideo: (videoPath) => {
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
            video.currentTime = storage(videoPath) || 0;
        });
        video.addEventListener('timeupdate', function () {
            storage(videoPath, video.currentTime);
        });
        video.setAttribute('src', videoPath);
        video.setAttribute('controls', 'true');
        video.setAttribute('autoplay', 'true');

        let setSubtitle = (path) => {
            let subtitle = document.createElement('track');
            subtitle.setAttribute('default', 'true');
            subtitle.setAttribute('kind', 'subtitles');
            subtitle.setAttribute('src', path);
            video.appendChild(subtitle);
        };

        let subtitlePath = videoPath.replace(re, '.vtt');
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
                video.parentNode.removeChild(video);
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