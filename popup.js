// WebSage Popup Script
class WebSagePopup {
  constructor() {
    this.settings = {};
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupUI();
    this.setupEventListeners();
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['webSageSettings', 'googleApiKeys'], (result) => {
        this.settings = result.webSageSettings || {
          provider: 'gemini',
          model: 'gemini-2.0-flash-exp',
          contextEnabled: true,
          memoryEnabled: true,
          contextMode: 'intelligent',
          maxTokens: 1500,
          theme: 'light',
          nlpEnabled: true,
          sentimentAnalysis: true,
          intentClassification: true,
          conversationInsights: true,
          animationsEnabled: true,
          notificationsEnabled: true,
          apiKeys: {}
        };
        this.googleApiKeys = result.googleApiKeys || {
          gemini: '',
          cloudTranslation: '',
          naturalLanguage: '',
          factCheck: '',
          customSearch: '',
          customSearchEngineId: '',
          safeBrowsing: ''
        };
        resolve();
      });
    });
  }

  setupUI() {
    // Set current values
    document.getElementById('provider').value = this.settings.provider;
    document.getElementById('contextEnabled').checked = this.settings.contextEnabled;
    document.getElementById('memoryEnabled').checked = this.settings.memoryEnabled;
    document.getElementById('contextMode').value = this.settings.contextMode;
    document.getElementById('maxTokens').value = this.settings.maxTokens;
    document.getElementById('theme').value = this.settings.theme;
    
    // Set NLP settings
    document.getElementById('nlpEnabled').checked = this.settings.nlpEnabled;
    document.getElementById('sentimentAnalysis').checked = this.settings.sentimentAnalysis;
    document.getElementById('intentClassification').checked = this.settings.intentClassification;
    document.getElementById('conversationInsights').checked = this.settings.conversationInsights;
    
    // Set animations and notifications
    if (document.getElementById('animationsEnabled')) {
      document.getElementById('animationsEnabled').checked = this.settings.animationsEnabled;
    }
    if (document.getElementById('notificationsEnabled')) {
      document.getElementById('notificationsEnabled').checked = this.settings.notificationsEnabled;
    }
    
    // Set Google API keys
    if (document.getElementById('geminiKey')) {
      document.getElementById('geminiKey').value = this.googleApiKeys.gemini || '';
    }
    if (document.getElementById('cloudNlpKey')) {
      document.getElementById('cloudNlpKey').value = this.googleApiKeys.naturalLanguage || '';
    }
    if (document.getElementById('customSearchKey')) {
      document.getElementById('customSearchKey').value = this.googleApiKeys.customSearch || '';
    }
    if (document.getElementById('searchEngineId')) {
      document.getElementById('searchEngineId').value = this.googleApiKeys.customSearchEngineId || '';
    }
    
    // Update model options based on provider
    this.updateModelOptions();
  }

  setupEventListeners() {
    // Provider change
    document.getElementById('provider').addEventListener('change', (e) => {
      this.settings.provider = e.target.value;
      this.updateModelOptions();
    });

    // Save settings
    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveSettings();
    });

    // Test connection
    document.getElementById('testConnection').addEventListener('click', () => {
      this.testConnection();
    });
    
    // Quick actions
    if (document.getElementById('quickTest')) {
      document.getElementById('quickTest').addEventListener('click', () => {
        this.testConnection();
      });
    }
    
    if (document.getElementById('quickReset')) {
      document.getElementById('quickReset').addEventListener('click', () => {
        if (confirm('Reset all settings to defaults?')) {
          this.resetSettings();
        }
      });
    }
  }

  updateModelOptions() {
    const modelSelect = document.getElementById('model');
    const provider = this.settings.provider;
    
    // Clear existing options
    modelSelect.innerHTML = '';
    
    let models = [];
    switch (provider) {
      case 'openai':
        models = [
          { value: 'gpt-4o', text: 'GPT-4o (Best)' },
          { value: 'gpt-4-turbo', text: 'GPT-4 Turbo' },
          { value: 'gpt-4', text: 'GPT-4' },
          { value: 'gpt-3.5-turbo', text: 'GPT-3.5 Turbo' }
        ];
        break;
      case 'gemini':
        models = [
          { value: 'gemini-2.0-flash-exp', text: 'Gemini 2.0 Flash Exp ⚡ (Fastest)' },
          { value: 'gemini-1.5-pro', text: 'Gemini 1.5 Pro 💎 (Best Quality)' },
          { value: 'gemini-1.5-flash', text: 'Gemini 1.5 Flash' },
          { value: 'gemini-1.0-pro', text: 'Gemini 1.0 Pro' }
        ];
        break;
      case 'mistral':
        models = [
          { value: 'mistral-large-latest', text: 'Mistral Large (Best)' },
          { value: 'mistral-medium-latest', text: 'Mistral Medium' },
          { value: 'mistral-small-latest', text: 'Mistral Small' },
          { value: 'mistral-tiny', text: 'Mistral Tiny' }
        ];
        break;
    }
    
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.value;
      option.textContent = model.text;
      modelSelect.appendChild(option);
    });
    
    // Set current model or default to first option
    modelSelect.value = this.settings.model || models[0].value;
  }


  async saveSettings() {
    // Collect form data
    this.settings.provider = document.getElementById('provider').value;
    this.settings.model = document.getElementById('model').value;
    this.settings.contextEnabled = document.getElementById('contextEnabled').checked;
    this.settings.memoryEnabled = document.getElementById('memoryEnabled').checked;
    this.settings.contextMode = document.getElementById('contextMode').value;
    this.settings.maxTokens = parseInt(document.getElementById('maxTokens').value);
    this.settings.theme = document.getElementById('theme').value;
    
    // Collect NLP settings
    this.settings.nlpEnabled = document.getElementById('nlpEnabled').checked;
    this.settings.sentimentAnalysis = document.getElementById('sentimentAnalysis').checked;
    this.settings.intentClassification = document.getElementById('intentClassification').checked;
    this.settings.conversationInsights = document.getElementById('conversationInsights').checked;
    
    // Collect animations and notifications
    if (document.getElementById('animationsEnabled')) {
      this.settings.animationsEnabled = document.getElementById('animationsEnabled').checked;
    }
    if (document.getElementById('notificationsEnabled')) {
      this.settings.notificationsEnabled = document.getElementById('notificationsEnabled').checked;
    }
    
    // Collect Google API keys
    if (document.getElementById('geminiKey')) {
      const geminiKey = document.getElementById('geminiKey').value.trim();
      if (geminiKey) {
        this.googleApiKeys.gemini = geminiKey;
        this.settings.apiKeys.gemini = geminiKey; // Also save to old format for compatibility
      }
    }
    
    if (document.getElementById('cloudNlpKey')) {
      const nlpKey = document.getElementById('cloudNlpKey').value.trim();
      if (nlpKey) this.googleApiKeys.naturalLanguage = nlpKey;
    }
    
    if (document.getElementById('customSearchKey')) {
      const searchKey = document.getElementById('customSearchKey').value.trim();
      if (searchKey) this.googleApiKeys.customSearch = searchKey;
    }
    
    if (document.getElementById('searchEngineId')) {
      const engineId = document.getElementById('searchEngineId').value.trim();
      if (engineId) this.googleApiKeys.customSearchEngineId = engineId;
    }

    try {
      await chrome.storage.local.set({ 
        webSageSettings: this.settings,
        googleApiKeys: this.googleApiKeys
      });
      this.showStatus('Settings saved successfully! 🎉', 'success');
    } catch (error) {
      this.showStatus('Failed to save settings: ' + error.message, 'error');
    }
  }

  async testConnection() {
    const provider = this.settings.provider;
    let apiKey = '';
    
    // Get API key based on provider
    if (provider === 'gemini' && document.getElementById('geminiKey')) {
      apiKey = document.getElementById('geminiKey').value.trim();
    } else {
      apiKey = this.settings.apiKeys[provider] || '';
    }

    if (!apiKey) {
      this.showStatus('Please enter an API key first ⚠️', 'error');
      return;
    }

    this.showStatus('Testing connection... 🔄', 'info');

    try {
      let isValid = false;
      
      switch (provider) {
        case 'openai':
          isValid = await this.testOpenAI(apiKey);
          break;
        case 'gemini':
          isValid = await this.testGemini(apiKey);
          break;
        case 'mistral':
          isValid = await this.testMistral(apiKey);
          break;
      }

      if (isValid) {
        this.showStatus('✅ Connection successful! API key is valid.', 'success');
      } else {
        this.showStatus('❌ Connection failed. Please check your API key.', 'error');
      }
    } catch (error) {
      this.showStatus('❌ Connection test failed: ' + error.message, 'error');
    }
  }

  async testOpenAI(apiKey) {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return response.ok;
  }

  async testGemini(apiKey) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    return response.ok;
  }

  async testMistral(apiKey) {
    const response = await fetch('https://api.mistral.ai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return response.ok;
  }

  async resetSettings() {
    this.settings = {
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      contextEnabled: true,
      memoryEnabled: true,
      contextMode: 'intelligent',
      maxTokens: 1500,
      theme: 'light',
      nlpEnabled: true,
      sentimentAnalysis: true,
      intentClassification: true,
      conversationInsights: true,
      animationsEnabled: true,
      notificationsEnabled: true,
      apiKeys: {}
    };
    
    try {
      await chrome.storage.local.set({ webSageSettings: this.settings });
      this.setupUI();
      this.showStatus('Settings reset to defaults! 🔄', 'success');
    } catch (error) {
      this.showStatus('Failed to reset settings: ' + error.message, 'error');
    }
  }

  showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';

    // Hide after 3 seconds for success messages
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 3000);
    }
  }
}

// Global function for API key visibility toggle
window.toggleApiKeyVisibility = function(fieldId) {
  const input = document.getElementById(fieldId);
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
};

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WebSagePopup();
});
