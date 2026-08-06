// WebSage settings popup. Settings are shared with the content script through
// chrome.storage.local, so existing installations retain their configuration.
const DEFAULT_SETTINGS = {
  provider: 'openai',
  model: 'gpt-5.6-sol',
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

class WebSagePopup {
  constructor() {
    this.settings = {};
    this.modelsToken = 0;
    this.statusTimer = null;
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupUI();
    this.setupEventListeners();
  }

  async loadSettings() {
    const { webSageSettings: savedSettings = {} } = await chrome.storage.local.get('webSageSettings');
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...savedSettings,
      apiKeys: { ...(savedSettings.apiKeys || {}) }
    };
  }

  setupUI() {
    this.setValue('provider', this.settings.provider);
    this.setValue('contextMode', this.settings.contextMode);
    this.setValue('maxTokens', this.settings.maxTokens);
    this.setValue('theme', this.settings.theme);

    [
      'contextEnabled',
      'memoryEnabled',
      'nlpEnabled',
      'sentimentAnalysis',
      'intentClassification',
      'conversationInsights',
      'animationsEnabled',
      'notificationsEnabled'
    ].forEach((id) => this.setChecked(id, this.settings[id]));

    const apiKeyInput = document.getElementById('apiKey');
    if (apiKeyInput) apiKeyInput.value = this.settings.apiKeys[this.settings.provider] || '';

    this.setModelPlaceholder('Load models after adding your key');
    this.updateConnectionState();
  }

  setupEventListeners() {
    document.getElementById('provider')?.addEventListener('change', (event) => {
      this.settings.provider = event.target.value;
      this.updateApiKeyField();
      this.setModelPlaceholder('Load models for this provider');
      this.updateConnectionState();
    });

    document.getElementById('apiKey')?.addEventListener('input', () => {
      this.setModelPlaceholder('Load models after updating your key');
      this.updateConnectionState();
    });

    document.getElementById('toggleApiKey')?.addEventListener('click', () => this.toggleApiKeyVisibility());
    document.getElementById('loadModels')?.addEventListener('click', () => this.loadModels());
    document.getElementById('saveSettings')?.addEventListener('click', () => this.saveSettings());
    document.getElementById('testConnection')?.addEventListener('click', () => this.testConnection());
    document.getElementById('quickReset')?.addEventListener('click', () => this.openResetDialog());
    document.getElementById('cancelReset')?.addEventListener('click', () => document.getElementById('resetDialog')?.close());
    document.getElementById('confirmReset')?.addEventListener('click', () => this.resetSettings());
  }

  setValue(id, value) {
    const element = document.getElementById(id);
    if (element && value !== undefined && value !== null) element.value = String(value);
  }

  setChecked(id, checked) {
    const element = document.getElementById(id);
    if (element) element.checked = Boolean(checked);
  }

  toggleApiKeyVisibility() {
    const apiKeyInput = document.getElementById('apiKey');
    const toggleButton = document.getElementById('toggleApiKey');
    if (!apiKeyInput || !toggleButton) return;

    const isVisible = apiKeyInput.type === 'text';
    apiKeyInput.type = isVisible ? 'password' : 'text';
    toggleButton.setAttribute('aria-pressed', String(!isVisible));
    toggleButton.setAttribute('aria-label', isVisible ? 'Show API key' : 'Hide API key');
  }

  setModelPlaceholder(text) {
    const modelSelect = document.getElementById('model');
    if (!modelSelect) return;

    modelSelect.replaceChildren();
    const option = document.createElement('option');
    option.value = '';
    option.textContent = text;
    modelSelect.appendChild(option);
    modelSelect.disabled = true;
  }

  getFormProvider() {
    return document.getElementById('provider')?.value || this.settings.provider;
  }

  getFormApiKey() {
    return document.getElementById('apiKey')?.value.trim() || '';
  }

  collectSettingsFromForm() {
    const provider = this.getFormProvider();
    this.settings.provider = provider;

    const model = document.getElementById('model');
    if (model?.value) this.settings.model = model.value;

    ['contextEnabled', 'memoryEnabled', 'nlpEnabled', 'sentimentAnalysis', 'intentClassification', 'conversationInsights', 'animationsEnabled', 'notificationsEnabled'].forEach((id) => {
      const element = document.getElementById(id);
      if (element) this.settings[id] = element.checked;
    });

    ['contextMode', 'theme'].forEach((id) => {
      const element = document.getElementById(id);
      if (element) this.settings[id] = element.value;
    });

    const maxTokens = Number.parseInt(document.getElementById('maxTokens')?.value || '', 10);
    if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
      throw new Error('Choose a valid context limit.');
    }
    this.settings.maxTokens = maxTokens;

    const apiKey = this.getFormApiKey();
    if (apiKey) this.settings.apiKeys[provider] = apiKey;
    else delete this.settings.apiKeys[provider];
  }

  updateApiKeyField() {
    const apiKeyInput = document.getElementById('apiKey');
    if (apiKeyInput) apiKeyInput.value = this.settings.apiKeys[this.settings.provider] || '';
  }

  async loadModels() {
    const provider = this.getFormProvider();
    const apiKey = this.getFormApiKey();
    const loadButton = document.getElementById('loadModels');
    const modelSelect = document.getElementById('model');
    const requestToken = ++this.modelsToken;

    if (!apiKey) {
      this.showStatus('Add an API key before loading models.', 'error');
      document.getElementById('apiKey')?.focus();
      return;
    }

    this.settings.provider = provider;
    this.setButtonBusy(loadButton, true, 'Loading…');
    this.setModelPlaceholder('Loading models…');
    this.setConnectionState('testing', 'Loading models');

    try {
      const models = await this.fetchModels(provider, apiKey);
      if (requestToken !== this.modelsToken || !modelSelect) return;

      modelSelect.replaceChildren();
      if (models.length === 0) {
        this.setModelPlaceholder('No compatible models were found');
        this.showStatus('No compatible chat models were returned for this key.', 'error');
        this.setConnectionState('error', 'No models found');
        return;
      }

      models.forEach((id) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = id;
        modelSelect.appendChild(option);
      });
      modelSelect.disabled = false;
      modelSelect.value = models.includes(this.settings.model) ? this.settings.model : models[0];
      this.showStatus(`${models.length} models loaded. Choose one, then save your settings.`, 'success');
      this.setConnectionState('connected', `${this.getProviderLabel()} models ready`);
    } catch (error) {
      if (requestToken !== this.modelsToken) return;
      this.setModelPlaceholder('Could not load models');
      this.showStatus(this.getRequestError('Could not load models', error), 'error');
      this.setConnectionState('error', 'Model lookup failed');
    } finally {
      if (requestToken === this.modelsToken) this.setButtonBusy(loadButton, false);
    }
  }

  async fetchModels(provider, apiKey) {
    let response;
    switch (provider) {
      case 'openai':
        response = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
        break;
      case 'gemini':
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        break;
      case 'mistral':
        response = await fetch('https://api.mistral.ai/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
        break;
      case 'kilo':
        response = await fetch('https://api.kilo.ai/api/gateway/models', { headers: { Authorization: `Bearer ${apiKey}` } });
        break;
      default:
        throw new Error('Unknown provider');
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return this.extractModelIds(data).filter((id) => this.isChatModel(provider, id));
  }

  extractModelIds(data) {
    const list = Array.isArray(data) ? data : (data?.data || data?.models || []);
    return list
      .map((model) => model.id || (model.name || '').replace(/^models\//, ''))
      .filter(Boolean);
  }

  isChatModel(provider, id) {
    if (/embedding|whisper|tts|dall-e|moderation|realtime|audio|image|video|transcription|speech|imagen|aqa|bison|rerank/i.test(id)) return false;
    return provider !== 'gemini' || /^(gemini|gemma)/.test(id);
  }

  async saveSettings() {
    const saveButton = document.getElementById('saveSettings');
    try {
      this.collectSettingsFromForm();
      this.setButtonBusy(saveButton, true, 'Saving…');
      await chrome.storage.local.set({ webSageSettings: this.settings });
      this.showStatus('Settings saved. WebSage is ready when you are.', 'success');
      this.updateConnectionState();
    } catch (error) {
      this.showStatus(error.message || 'WebSage could not save your settings.', 'error');
    } finally {
      this.setButtonBusy(saveButton, false);
    }
  }

  async testConnection() {
    const apiKey = this.getFormApiKey();
    const provider = this.getFormProvider();
    const testButton = document.getElementById('testConnection');

    if (!apiKey) {
      this.showStatus('Add an API key before testing the connection.', 'error');
      document.getElementById('apiKey')?.focus();
      return;
    }

    this.setButtonBusy(testButton, true, 'Testing…');
    this.showStatus(`Testing ${this.getProviderLabel(provider)}…`, 'info');
    this.setConnectionState('testing', 'Testing connection');

    try {
      const isValid = await this.testProvider(provider, apiKey);
      if (!isValid) throw new Error('The provider rejected this API key.');
      this.showStatus(`Connected to ${this.getProviderLabel(provider)}. Save settings to keep this key.`, 'success');
      this.setConnectionState('connected', `${this.getProviderLabel(provider)} connected`);
    } catch (error) {
      this.showStatus(this.getRequestError('Connection failed', error), 'error');
      this.setConnectionState('error', 'Connection failed');
    } finally {
      this.setButtonBusy(testButton, false);
    }
  }

  async testProvider(provider, apiKey) {
    switch (provider) {
      case 'openai': return (await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } })).ok;
      case 'gemini': return (await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)).ok;
      case 'mistral': return (await fetch('https://api.mistral.ai/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } })).ok;
      case 'kilo': return (await fetch('https://api.kilo.ai/api/gateway/models', { headers: { Authorization: `Bearer ${apiKey}` } })).ok;
      default: throw new Error('Unknown provider');
    }
  }

  openResetDialog() {
    const dialog = document.getElementById('resetDialog');
    if (dialog && !dialog.open) dialog.showModal();
  }

  async resetSettings() {
    const resetButton = document.getElementById('confirmReset');
    try {
      this.setButtonBusy(resetButton, true, 'Resetting…');
      this.settings = { ...DEFAULT_SETTINGS, apiKeys: { ...this.settings.apiKeys } };
      await chrome.storage.local.set({ webSageSettings: this.settings });
      document.getElementById('resetDialog')?.close();
      this.setupUI();
      this.showStatus('Settings reset. Your API keys were kept.', 'success');
    } catch (error) {
      this.showStatus('WebSage could not reset your settings.', 'error');
    } finally {
      this.setButtonBusy(resetButton, false);
    }
  }

  setButtonBusy(button, isBusy, busyLabel = '') {
    if (!button) return;
    if (isBusy) {
      button.dataset.idleLabel = button.textContent.trim();
      button.disabled = true;
      button.replaceChildren();
      const spinner = document.createElement('span');
      spinner.className = 'button-spinner';
      spinner.setAttribute('aria-hidden', 'true');
      button.append(spinner, document.createTextNode(busyLabel));
      return;
    }

    button.disabled = false;
    button.textContent = button.dataset.idleLabel || button.textContent;
  }

  getProviderLabel(provider = this.getFormProvider()) {
    return { openai: 'OpenAI', gemini: 'Google Gemini', mistral: 'Mistral AI', kilo: 'Kilo AI' }[provider] || 'Provider';
  }

  getRequestError(prefix, error) {
    if (error?.message?.startsWith('HTTP ')) return `${prefix}: ${error.message}. Check the API key and try again.`;
    return `${prefix}. Check your connection and API key, then try again.`;
  }

  updateConnectionState() {
    const apiKey = this.getFormApiKey();
    this.setConnectionState(apiKey ? '' : 'idle', apiKey ? `${this.getProviderLabel()} ready to test` : 'Setup required');
  }

  setConnectionState(state, text) {
    const connectionState = document.getElementById('connectionState');
    if (!connectionState) return;
    connectionState.className = `connection-state${state ? ` ${state}` : ''}`;
    connectionState.textContent = text;
  }

  showStatus(message, type) {
    const status = document.getElementById('status');
    if (!status) return;

    clearTimeout(this.statusTimer);
    status.textContent = message;
    status.className = `status ${type}`;
    status.setAttribute('aria-hidden', 'false');

    if (type === 'success') {
      this.statusTimer = window.setTimeout(() => status.setAttribute('aria-hidden', 'true'), 5000);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new WebSagePopup();
});
