// WebSage Background Service Worker - Enhanced with Context Menu and Advanced Features
class WebSageBackground {
  constructor() {
    this.setupEventListeners();
    this.setupContextMenus();
  }

  setupEventListeners() {
    // Handle keyboard shortcut
    chrome.commands.onCommand.addListener((command) => {
      if (command === 'toggle-websage') {
        this.toggleWebSage();
      }
    });

    // Handle context menu clicks
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenuClick(info, tab);
    });

    // Handle installation
    chrome.runtime.onInstalled.addListener(() => {
      this.initializeExtension();
    });

    // Handle cross-origin API fetches from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'websage-api-fetch') {
        fetch(request.url, request.options)
          .then(async response => {
            const text = await response.text();
            sendResponse({
              ok: response.ok,
              status: response.status,
              text: text
            });
          })
          .catch(error => {
            sendResponse({
              ok: false,
              status: 0,
              text: error.message
            });
          });
        return true; // Keep channel open for async response
      }
    });
  }

  setupContextMenus() {
    chrome.contextMenus.removeAll(() => {
      // Main WebSage menu
      chrome.contextMenus.create({
        id: 'websage-main',
        title: 'WebSage AI Assistant',
        contexts: ['page', 'selection']
      });

      // Quick actions for selected text
      chrome.contextMenus.create({
        id: 'websage-explain',
        parentId: 'websage-main',
        title: '💬 Explain this',
        contexts: ['selection']
      });

      chrome.contextMenus.create({
        id: 'websage-summarize',
        parentId: 'websage-main',
        title: '📝 Summarize this',
        contexts: ['selection']
      });

      chrome.contextMenus.create({
        id: 'websage-translate',
        parentId: 'websage-main',
        title: '🌐 Translate this',
        contexts: ['selection']
      });

      chrome.contextMenus.create({
        id: 'websage-analyze-sentiment',
        parentId: 'websage-main',
        title: '😊 Analyze sentiment',
        contexts: ['selection']
      });

      // New fake news and bias detection options
      chrome.contextMenus.create({
        id: 'websage-check-fake-news',
        parentId: 'websage-main',
        title: '🛡️ Check for fake news',
        contexts: ['selection']
      });

      chrome.contextMenus.create({
        id: 'websage-detect-bias',
        parentId: 'websage-main',
        title: '⚖️ Detect bias',
        contexts: ['selection']
      });

      chrome.contextMenus.create({
        id: 'websage-separator1',
        parentId: 'websage-main',
        type: 'separator'
      });

      // Page-level analysis options
      chrome.contextMenus.create({
        id: 'websage-analyze-page',
        parentId: 'websage-main',
        title: '🔍 Analyze entire page',
        contexts: ['page']
      });

      chrome.contextMenus.create({
        id: 'websage-check-page-credibility',
        parentId: 'websage-main',
        title: '🏆 Check page credibility',
        contexts: ['page']
      });

      chrome.contextMenus.create({
        id: 'websage-separator2',
        parentId: 'websage-main',
        type: 'separator'
      });

      chrome.contextMenus.create({
        id: 'websage-chat',
        parentId: 'websage-main',
        title: '💬 Open WebSage Chat',
        contexts: ['page']
      });
    });
  }

  async toggleWebSage() {
    console.log('WebSage toggle requested');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Current tab:', tab?.url);

      if (!tab || !tab.id || tab.url.startsWith('chrome://') || tab.url.startsWith('about://')) {
        console.log('WebSage cannot run on this page');
        return;
      }

      // The content script is declared in manifest content_scripts, so on
      // normal pages it is already present — message it directly. Only if
      // the receiver is missing (e.g. the extension was reloaded after the
      // page loaded) do we inject the script once.
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'websage-command', command: 'toggle' });
      } catch (err) {
        await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['styles.css'] });
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        await chrome.tabs.sendMessage(tab.id, { type: 'websage-command', command: 'toggle' });
      }
    } catch (error) {
      console.error('Error toggling WebSage:', error);
    }
  }

  async handleContextMenuClick(info, tab) {
    if (!tab || !tab.id || tab.url.startsWith('chrome://') || tab.url.startsWith('about://')) {
      return;
    }

    // Map context menu items to content-side commands.
    const commandMap = {
      'websage-explain': 'explain',
      'websage-summarize': 'summarize',
      'websage-translate': 'translate',
      'websage-analyze-sentiment': 'analyze',
      'websage-check-fake-news': 'check-fake-news',
      'websage-detect-bias': 'detect-bias',
      'websage-analyze-page': 'analyze-page',
      'websage-check-page-credibility': 'check-credibility',
      'websage-chat': 'open-chat'
    };
    const command = commandMap[info.menuItemId];
    if (!command) return;

    try {
      const text = info.selectionText || '';
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'websage-command', command, text });
      } catch (err) {
        // Content script missing (extension reloaded after page load): inject once.
        await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['styles.css'] });
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        await chrome.tabs.sendMessage(tab.id, { type: 'websage-command', command, text });
      }
    } catch (error) {
      console.error('Error handling context menu click:', error);
    }
  }

  initializeExtension() {
    // Set default settings with enhanced NLP options
    chrome.storage.local.get(['webSageSettings'], (result) => {
      if (!result.webSageSettings) {
        const defaultSettings = {
          provider: 'openai',
          model: 'gpt-5.6-sol',
          contextEnabled: true,
          memoryEnabled: true,
          contextMode: 'intelligent',
          maxTokens: 1500,
          theme: 'light',
          nlpEnabled: true,
          sentimentAnalysis: true,
          entityExtraction: true,
          intentClassification: true,
          conversationInsights: true,
          apiKeys: {}
        };
        chrome.storage.local.set({ webSageSettings: defaultSettings });
      }
    });
  }
}

// Initialize background service
new WebSageBackground();