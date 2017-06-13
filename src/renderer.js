const {
    selectDir, selectSub, getFiles, makeVideo,
    step, record, makeList,
    store, find
} = require('./lib');

let openBtn = document.getElementById('open-btn');
let foldBtn = document.getElementById('fold-btn');
let backBtn = document.getElementById('back-btn');
let clearBtn = document.getElementById('clear-btn');
let listEle = document.getElementById('list');
let preview = document.getElementById('preview');
let historyRecord = document.getElementById('history-record');
let playground = document.getElementById('playground');
let box = document.getElementById('box');
let subtitle = document.getElementById('subtitle');
let title = document.getElementById('title');
let page1 = document.getElementById('page1');
let page2 = document.getElementById('page2');
let replaceBtn = document.getElementById('replace-btn');
let subInp = document.getElementById('sub-inp');

let video;
let clearPlayground = () => {
    box.innerHTML = '';
    subtitle.innerHTML = '';
};
let back = step((e, finish) => {
    clearPlayground();
    page2.style.transform = 'translate(0, 0)';
    video && video.destroy();
    video = null;
    refreshFileList(() => {
        refreshRecord();
        finish();
    });
});
let playVideo = (item) => {
    clearPlayground();
    title.innerHTML = item.filename;
    record.push(item);
    video = makeVideo(item);
    video.appendTo(box);
    page2.style.transform = 'translate(-100%, 0)';
};
let refreshFileList = (cb) => {
    let dir = find('dir') || './';
    getFiles(dir, (list) => {
        preview.innerHTML = '';
        preview.appendChild(makeList(list));
        store('div', dir);
        cb();
    });
};
let refreshRecord = () => {
    historyRecord.innerHTML = '';
    historyRecord.appendChild(makeList(record.get()));
};

document.addEventListener('keydown', function (e) {
    if (!video) {
        return;
    }
    switch (e.key) {
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
            preview.style.display = 'block';
            foldBtn.innerHTML = 'Fold';
        } else {
            preview.style.display = 'none';
            foldBtn.innerHTML = 'Unfold';
        }
        flag = !flag;
        finish();
    }
})()));
replaceBtn.addEventListener('click', step((e, finish) => {
    selectSub((err, file) => {
        if (err) {
            return finish();
        }
        video && video.replaceSubtitle(file);
        finish();
    })
}));

backBtn.addEventListener('click', back);
clearBtn.addEventListener('click', step((e, finish) => {
    historyRecord.innerHTML = '';
    record.destroy();
    refreshFileList(() => {
        refreshRecord();
        finish();
    })
}));

listEle.addEventListener('click', step((e, finish) => {
    let item = e.target.ant;
    if (!item) {
        return finish();
    }
    if (item.type === 'file') {
        playVideo(item);
        setTimeout(finish, 1000);
    } else if (item.type === 'dir') {
        store('dir', item.path);
        refreshFileList(finish);
    } else {
        finish();
    }
}));

openBtn.addEventListener('click', step((e, finish) => {
    selectDir((err, dir) => {
        if (err) {
            return finish();
        }
        store('dir', dir);
        refreshFileList(finish);
    });
}));

refreshFileList(() => {
    refreshRecord();
});