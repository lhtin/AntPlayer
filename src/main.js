const path = require('path');
const url = require('url');

const {app, BrowserWindow, Menu} = require('electron');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        title: 'Ant Player',
        fullscreen: true
    });
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));
    mainWindow.on('closed', function () {
        mainWindow = null
    })
}
let template = [{
    label: 'Edit',
    submenu: [
        {role: 'copy', label: 'Copy'}
    ]
}];
if (process.platform === 'darwin') {
    template.unshift({
        label: app.getName(),
        submenu: [
            {role: 'about', label: 'About'},
            {role: 'quit', label: 'Quit'}
        ]
    });
}

app.on('ready', () => {
    const menu = Menu.buildFromTemplate(template);
    // Menu.setApplicationMenu(menu);
    createWindow();
});
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});
app.on('activate', function () {
    if (mainWindow === null) {
        createWindow()
    }
});
