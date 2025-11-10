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

    // Handle messages from content scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
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
      
      if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('about://')) {
        console.log('WebSage cannot run on this page');
        return;
      }

      // First, inject CSS styles
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['styles.css']
      });

      // Then inject the content script if it's not already there
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // Wait a moment for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 200));

      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          console.log('Executing toggle script, webSageToggle exists:', typeof window.webSageToggle);
          if (window.webSageToggle) {
            window.webSageToggle();
            return 'Toggle executed successfully';
          } else {
            console.error('webSageToggle function not found - trying to initialize');
            return 'webSageToggle function not found';
          }
        }
      });
      console.log('Script execution result:', result);
    } catch (error) {
      console.error('Error toggling WebSage:', error);
    }
  }

  async handleContextMenuClick(info, tab) {
    if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('about://')) {
      return;
    }

    try {
      // Inject scripts first
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['styles.css']
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 300));

      // Handle different context menu actions
      switch (info.menuItemId) {
        case 'websage-explain':
          await this.sendContextMenuMessage(tab.id, 'explain', info.selectionText);
          break;
        case 'websage-summarize':
          await this.sendContextMenuMessage(tab.id, 'summarize', info.selectionText);
          break;
        case 'websage-translate':
          await this.sendContextMenuMessage(tab.id, 'translate', info.selectionText);
          break;
        case 'websage-analyze-sentiment':
          await this.sendContextMenuMessage(tab.id, 'analyze', info.selectionText);
          break;
        case 'websage-check-fake-news':
          await this.sendContextMenuMessage(tab.id, 'check-fake-news', info.selectionText);
          break;
        case 'websage-detect-bias':
          await this.sendContextMenuMessage(tab.id, 'detect-bias', info.selectionText);
          break;
        case 'websage-analyze-page':
          await this.sendContextMenuMessage(tab.id, 'analyze-page', '');
          break;
        case 'websage-check-page-credibility':
          await this.sendContextMenuMessage(tab.id, 'check-credibility', '');
          break;
        case 'websage-chat':
          await this.sendContextMenuMessage(tab.id, 'toggle', '');
          break;
      }
    } catch (error) {
      console.error('Error handling context menu click:', error);
    }
  }

  async sendContextMenuMessage(tabId, action, text) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (action, text) => {
          if (window.webSageHandleContextMenu) {
            window.webSageHandleContextMenu(action, text);
          }
        },
        args: [action, text]
      });
    } catch (error) {
      console.error('Error sending context menu message:', error);
    }
  }

  handleMessage(request, sender, sendResponse) {
    switch (request.type) {
      case 'getSettings':
        chrome.storage.local.get(['webSageSettings'], (result) => {
          sendResponse(result.webSageSettings);
        });
        break;
      case 'saveSettings':
        chrome.storage.local.set({ webSageSettings: request.settings }, () => {
          sendResponse({ success: true });
        });
        break;
      case 'analyzeText':
        // Could be used for server-side NLP processing if needed
        sendResponse({ analysis: 'Client-side processing' });
        break;
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  initializeExtension() {
    // Set default settings with enhanced NLP options
    chrome.storage.local.get(['webSageSettings'], (result) => {
      if (!result.webSageSettings) {
        const defaultSettings = {
          provider: 'openai',
          model: 'gpt-4o',
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