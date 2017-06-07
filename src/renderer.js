const {
    selectDir, getFiles, makeFileList, makeVideo,
    isVideoFile, step, record, makeList,
    store, find,
    log
} = require('./lib');

let openBtn = document.getElementById('open-btn');
let foldBtn = document.getElementById('fold-btn');
let backBtn = document.getElementById('back-btn');
let clearBtn = document.getElementById('clear-btn');
let listEle = document.getElementById('list');
let preview = document.getElementById('preview');
let historyRecord = document.getElementById('history-record');
let playground = document.getElementById('playground');
let title = document.getElementById('title');
let page1 = document.getElementById('page1');
let page2 = document.getElementById('page2');

// let $ = ((ss) => {
//     let _$ = {};
//     for (let i = 0, len = ss.length; i < len; i += 1) {
//         _$[ss[i]] = document.querySelector(ss[i]);
//     }
//     return (s) => {
//         return _$[s];
//     }
// })(['#btn', '#list', '#playground', '#title', '#page1', '#page2', '#back', '#history-record']);

let video;
let back = step((e, finish) => {
    playground.innerHTML = '';
    page2.style.transform = 'translate(0, 0)';
    video && video.destroy();
    video = null;
    refresh(finish);
});
document.addEventListener('keydown', function (e) {
    if (!video) {
        return;
    }
    switch(e.key) {
        case ' ':
            video.toggle();
            e.preventDefault();
            break;
        case 'ArrowLeft':
            video.prev();
            break;
        case 'ArrowRight':
            video.next();
            break;
        case 'Escape':
            back();
            break;
    }
});
foldBtn.addEventListener('click', step((() => {
    let flag = false;
    return (e, finish) => {
        if (flag) {
            refresh(() => {
                foldBtn.innerHTML = 'Fold';
                finish();
            });
        } else {
            preview.innerHTML = '';
            foldBtn.innerHTML = 'Unfold';
            finish();
        }
        flag = !flag;
    }
})()));

backBtn.addEventListener('click', back);
let playVideo = (item) => {
    playground.innerHTML = '';
    title.innerHTML = item.filename;
    record.push(item);
    video = makeVideo(item);
    video.appendTo(playground);
    page2.style.transform = 'translate(-100%, 0)';
};
clearBtn.addEventListener('click', step((e, finish) => {
    historyRecord.innerHTML = '';
    record.destroy();
    refresh(finish);
}));

let showFileList = (dir, cb) => {
    getFiles(dir, (err, files) => {
        if (err) {
            throw err;
        }
        makeFileList(dir, files, (err, list) => {
            if (err) {
                throw err;
            }
            preview.innerHTML = '';
            preview.appendChild(makeList(list));
            store('div', dir);
            cb && cb();
        })
    });
};

listEle.addEventListener('click', step((e, finish) => {
    let item = e.target.ant;
    if (!item) {
        return finish();
    }
    if (item.type === 'file') {
        if (isVideoFile(item.filename)) {
            playVideo(item);
            setTimeout(finish, 1000);
        } else {
            finish();
        }
    } else if (item.type === 'dir') {
        store('dir', item.path);
        refresh(finish);
    } else {
        finish();
    }
}));

openBtn.addEventListener('click', step((e, finish) => {
    selectDir((err, dir) => {
        if (err) {
            return finish();
        }
        showFileList(dir, finish);
    });
}));

let refresh = (cb) => {
    let dir = find('dir') || './';
    showFileList(dir, () => {
        historyRecord.innerHTML = '';
        historyRecord.appendChild(makeList(record.get()));
        cb && cb();
    });
};

refresh();

