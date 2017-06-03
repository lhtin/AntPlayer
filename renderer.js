const {selectDir, getFiles, makeFileList, makeVideo} = require('./lib');

let btn = document.getElementById('btn');
let listEle = document.getElementById('list');
let playground = document.getElementById('playground');
let page1 = document.getElementById('page1');
let page2 = document.getElementById('page2');
let back = document.getElementById('back');

let video;

document.addEventListener('keydown', function (e) {
    if (!video) {
        return;
    }
    if (e.key === ' ') {
        video.toggle();
        e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
        video.prev();
    } else if (e.key === 'ArrowRight') {
        video.next();
    }
});
back.addEventListener('click', () => {
    video = null;
    playground.innerHTML = '';
    page2.style.transform = 'translate(0, 0)';
});
let goPlayground = () => {
    page2.style.transform = 'translate(-100%, 0)';
};

let playVideo = (item) => {
    playground.innerHTML = '';
    video = makeVideo(item.path);
    video.appendTo(playground);
    goPlayground();
};

let showFileList = (dir, cb) => {
    getFiles(dir, (err, files) => {
        if (err) {
            throw err;
        }
        makeFileList(dir, files, (err, list) => {
            if (err) {
                throw err;
            }
            let frag = document.createDocumentFragment();
            let div = document.createElement('div');
            div.className = 'dir';
            div.innerHTML = '..';
            for (let item of list) {
                let div = document.createElement('div');
                div.className = item.type;
                div.innerHTML = `${item.name}`;
                div.data = item;
                frag.appendChild(div);
            }
            listEle.innerHTML = '';
            listEle.appendChild(frag);
            localStorage.setItem('dir', dir);
            cb && cb();
        })
    });
};

let xxx = (f) => {
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
};

listEle.addEventListener('click', xxx((e, finish) => {
    let item = e.target.data;
    if (!item) {
        return;
    }
    if (item.type === 'file') {
        if (/\.(?:mp4|webm)$/.test(item.name)) {
            playVideo(item);
        }
        finish();
    } else if (item.type === 'dir') {
        showFileList(item.path, finish);
    }
}));
btn.addEventListener('click', xxx((e, finish) => {
    selectDir((err, dir) => {
        if (err) {
            finish();
            throw err;
        }
        showFileList(dir, finish);
    });
}));

let dir = localStorage.getItem('dir');
showFileList(dir || './');
