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
      chrome.storage.local.get(['webSageSettings'], (result) => {
        this.settings = result.webSageSettings || {
          provider: 'openai',
          model: 'gpt-4o',
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
        resolve();
      });
    });
  }

  setupUI() {
    // Set current values with null checks
    const provider = document.getElementById('provider');
    if (provider) provider.value = this.settings.provider;
    
    const contextEnabled = document.getElementById('contextEnabled');
    if (contextEnabled) contextEnabled.checked = this.settings.contextEnabled;
    
    const memoryEnabled = document.getElementById('memoryEnabled');
    if (memoryEnabled) memoryEnabled.checked = this.settings.memoryEnabled;
    
    const contextMode = document.getElementById('contextMode');
    if (contextMode) contextMode.value = this.settings.contextMode;
    
    const maxTokens = document.getElementById('maxTokens');
    if (maxTokens) maxTokens.value = this.settings.maxTokens;
    
    const theme = document.getElementById('theme');
    if (theme) theme.value = this.settings.theme;
    
    // Set NLP settings
    const nlpEnabled = document.getElementById('nlpEnabled');
    if (nlpEnabled) nlpEnabled.checked = this.settings.nlpEnabled;
    
    const sentimentAnalysis = document.getElementById('sentimentAnalysis');
    if (sentimentAnalysis) sentimentAnalysis.checked = this.settings.sentimentAnalysis;
    
    const intentClassification = document.getElementById('intentClassification');
    if (intentClassification) intentClassification.checked = this.settings.intentClassification;
    
    const conversationInsights = document.getElementById('conversationInsights');
    if (conversationInsights) conversationInsights.checked = this.settings.conversationInsights;
    
    // Set UI settings
    const animationsEnabled = document.getElementById('animationsEnabled');
    if (animationsEnabled) animationsEnabled.checked = this.settings.animationsEnabled;
    
    const notificationsEnabled = document.getElementById('notificationsEnabled');
    if (notificationsEnabled) notificationsEnabled.checked = this.settings.notificationsEnabled;
    
    // Set API key for current provider
    const apiKey = this.settings.apiKeys[this.settings.provider] || '';
    const apiKeyInput = document.getElementById('apiKey');
    if (apiKeyInput) apiKeyInput.value = apiKey;
    
    // Update model options based on provider
    this.updateModelOptions();
  }

  setupEventListeners() {
    // Provider change
    const provider = document.getElementById('provider');
    if (provider) {
      provider.addEventListener('change', (e) => {
        this.settings.provider = e.target.value;
        this.updateModelOptions();
        this.updateApiKeyField();
      });
    }

    // API key toggle visibility
    const toggleApiKey = document.getElementById('toggleApiKey');
    if (toggleApiKey) {
      toggleApiKey.addEventListener('click', () => {
        const apiKeyInput = document.getElementById('apiKey');
        const toggleBtn = document.getElementById('toggleApiKey');
        
        if (apiKeyInput && toggleBtn) {
          if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleBtn.textContent = '🙈';
          } else {
            apiKeyInput.type = 'password';
            toggleBtn.textContent = '👁️';
          }
        }
      });
    }

    // Save settings
    const saveSettings = document.getElementById('saveSettings');
    if (saveSettings) {
      saveSettings.addEventListener('click', () => {
        this.saveSettings();
      });
    }

    // Test connection
    const testConnection = document.getElementById('testConnection');
    if (testConnection) {
      testConnection.addEventListener('click', () => {
        this.testConnection();
      });
    }

    // Quick test button
    const quickTest = document.getElementById('quickTest');
    if (quickTest) {
      quickTest.addEventListener('click', () => {
        this.testConnection();
      });
    }

    // Quick reset button
    const quickReset = document.getElementById('quickReset');
    if (quickReset) {
      quickReset.addEventListener('click', () => {
        this.resetSettings();
      });
    }
  }

  updateModelOptions() {
    const modelSelect = document.getElementById('model');
    if (!modelSelect) return;
    
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
          { value: 'gemini-2.0-flash-exp', text: 'Gemini 2.0 Flash (Best)' },
          { value: 'gemini-1.5-pro', text: 'Gemini 1.5 Pro' },
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

  updateApiKeyField() {
    const apiKey = this.settings.apiKeys[this.settings.provider] || '';
    const apiKeyInput = document.getElementById('apiKey');
    if (apiKeyInput) apiKeyInput.value = apiKey;
  }

  async resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This will not delete your API keys.')) {
      return;
    }

    // Reset to default settings but preserve API keys
    const apiKeys = this.settings.apiKeys;
    this.settings = {
      provider: 'openai',
      model: 'gpt-4o',
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
      apiKeys: apiKeys
    };

    try {
      await chrome.storage.local.set({ webSageSettings: this.settings });
      this.setupUI();
      this.showStatus('Settings reset to defaults!', 'success');
    } catch (error) {
      this.showStatus('Failed to reset settings: ' + error.message, 'error');
    }
  }

  async saveSettings() {
    // Collect form data with null checks
    const provider = document.getElementById('provider');
    if (provider) this.settings.provider = provider.value;
    
    const model = document.getElementById('model');
    if (model) this.settings.model = model.value;
    
    const contextEnabled = document.getElementById('contextEnabled');
    if (contextEnabled) this.settings.contextEnabled = contextEnabled.checked;
    
    const memoryEnabled = document.getElementById('memoryEnabled');
    if (memoryEnabled) this.settings.memoryEnabled = memoryEnabled.checked;
    
    const contextMode = document.getElementById('contextMode');
    if (contextMode) this.settings.contextMode = contextMode.value;
    
    // Validate and save maxTokens
    const maxTokensEl = document.getElementById('maxTokens');
    if (maxTokensEl) {
      const tokens = parseInt(maxTokensEl.value);
      if (isNaN(tokens) || tokens < 0) {
        this.showStatus('Invalid max tokens value', 'error');
        return;
      }
      this.settings.maxTokens = tokens;
    }
    
    const theme = document.getElementById('theme');
    if (theme) this.settings.theme = theme.value;
    
    // Collect NLP settings
    const nlpEnabled = document.getElementById('nlpEnabled');
    if (nlpEnabled) this.settings.nlpEnabled = nlpEnabled.checked;
    
    const sentimentAnalysis = document.getElementById('sentimentAnalysis');
    if (sentimentAnalysis) this.settings.sentimentAnalysis = sentimentAnalysis.checked;
    
    const intentClassification = document.getElementById('intentClassification');
    if (intentClassification) this.settings.intentClassification = intentClassification.checked;
    
    const conversationInsights = document.getElementById('conversationInsights');
    if (conversationInsights) this.settings.conversationInsights = conversationInsights.checked;
    
    // Collect UI settings
    const animationsEnabled = document.getElementById('animationsEnabled');
    if (animationsEnabled) this.settings.animationsEnabled = animationsEnabled.checked;
    
    const notificationsEnabled = document.getElementById('notificationsEnabled');
    if (notificationsEnabled) this.settings.notificationsEnabled = notificationsEnabled.checked;
    
    // Save API key for current provider
    const apiKeyInput = document.getElementById('apiKey');
    if (apiKeyInput) {
      const apiKey = apiKeyInput.value.trim();
      if (apiKey) {
        this.settings.apiKeys[this.settings.provider] = apiKey;
      }
    }

    try {
      await chrome.storage.local.set({ webSageSettings: this.settings });
      this.showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      this.showStatus('Failed to save settings: ' + error.message, 'error');
    }
  }

  async testConnection() {
    const apiKeyInput = document.getElementById('apiKey');
    if (!apiKeyInput) {
      this.showStatus('API key input not found', 'error');
      return;
    }
    
    const apiKey = apiKeyInput.value.trim();
    const provider = this.settings.provider;

    if (!apiKey) {
      this.showStatus('Please enter an API key first', 'error');
      return;
    }

    this.showStatus('Testing connection...', 'info');

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
        this.showStatus('Connection successful!', 'success');
      } else {
        this.showStatus('Connection failed. Please check your API key.', 'error');
      }
    } catch (error) {
      this.showStatus('Connection test failed: ' + error.message, 'error');
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

  showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    if (!statusDiv) return;
    
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

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WebSagePopup();
});