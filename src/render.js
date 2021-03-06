/* globals document */
const fs = require('fs');
const path = require('path');
const { remote, ipcRenderer } = require('electron');
const Store = require('electron-store');
const SUPPORTED_LANGUAGES = require('../node_modules/cucumber-forge-report-generator/src/locales/supportedLocales.json');

const store = new Store();
const fileEncoding = 'utf-8';

let selectedFolderPath;
let projectName;
let reportHTML;
let tag;

const toggleLoadingInd = () => {
  if (reportHTML) {
    document.getElementById('appBody').classList.remove('empty');
  } else {
    document.getElementById('appBody').classList.add('empty');
  }

  const waitingMask = document.getElementById('mask');
  if (!waitingMask.style.display || waitingMask.style.display === 'none') {
    waitingMask.style.display = 'block';
  } else {
    waitingMask.style.display = 'none';
  }
};

const toggleSettingsVisibility = () => {
  const settingsDiv = document.getElementById('appSettings');
  if (!settingsDiv.style.display || settingsDiv.style.display === 'none') {
    // Settings are currently hidden. Un-hide them.
    if (reportHTML) {
      // If there is a report, hide it.
      document.getElementById('appBody').classList.add('empty');
      document.getElementById('output').style.display = 'none';
    }
    settingsDiv.style.display = 'block';
  } else {
    // Settings are currently un-hidden. Hide them.
    settingsDiv.style.display = 'none';
    if (reportHTML) {
      // If there is a report, un-hide it.
      document.getElementById('appBody').classList.remove('empty');
      document.getElementById('output').style.display = 'block';
    }
  }
};

ipcRenderer.on('create-report-reply', (event, arg) => {
  reportHTML = arg;

  if (document.getElementById('appSettings').style.display === 'block') {
    toggleSettingsVisibility();
  }

  toggleLoadingInd();
  document.getElementById('output').innerHTML = reportHTML;
  init(); // eslint-disable-line no-undef
});

const createReport = () => {
  tag = document.getElementById('tagBox').value;
  const request = {
    folderPath: selectedFolderPath,
    projectName,
    tag,
  };
  toggleLoadingInd();
  ipcRenderer.send('create-report-request', request);
};

const createReportForFolder = (folderPath) => {
  selectedFolderPath = folderPath;
  projectName = path.parse(folderPath).base;
  createReport();
};

const getDefaultOutputFileName = () => {
  let reportName = `${projectName}.html`;
  if (tag) {
    reportName = `${tag}_${reportName}`;
  }
  return reportName;
};

const writeReportHTMLToFile = (fileName) => {
  if (fileName === undefined) {
    return;
  }
  fs.writeFileSync(fileName, reportHTML, fileEncoding);
};

/* eslint-disable no-unused-vars */
const clickSaveButton = () => {
  const defPath = getDefaultOutputFileName();
  remote.dialog.showSaveDialog({
    title: 'Save Report',
    defaultPath: defPath,
  }).then((result) => writeReportHTMLToFile(result.filePath));
};

const clickFolderSelectionButton = async () => {
  const selectedPaths = await remote.dialog.showOpenDialog({
    properties: ['openFile', 'openDirectory'],
  });
  const [filePath] = selectedPaths.filePaths;
  if (filePath) {
    createReportForFolder(filePath);
  }
};

const clickFilterButton = () => {
  createReport();
};

const submitTagFiltersFromTextBox = (event) => {
  if (event.keyCode === 13) {
    createReport();
    event.preventDefault();
  }
};

const changeGherkinDialect = () => {
  const dialectSelector = document.getElementById('dialectSelection');
  store.set('gherkinDialect', dialectSelector.options[dialectSelector.selectedIndex].text);
};

const initSettings = () => {
  // Setup the current default dialect
  let gherkinDialect = store.get('gherkinDialect');
  if (!gherkinDialect) {
    gherkinDialect = 'en';
    store.set('gherkinDialect', gherkinDialect);
  }

  // Populate the dialect selector
  const dialectSelector = document.getElementById('dialectSelection');
  SUPPORTED_LANGUAGES.forEach((language) => {
    const opt = document.createElement('option');
    opt.value = language;
    opt.innerHTML = language;
    dialectSelector.appendChild(opt);
    if (gherkinDialect === language) {
      opt.selected = 'selected';
    }
  });

  // Set version
  document.getElementById('appVersion').innerHTML = `Version: ${remote.app.getVersion()}`;
};

initSettings();
