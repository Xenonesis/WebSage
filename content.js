// WebSage Content Script - Enhanced with Advanced UI/UX Features

// Prevent multiple script executions
if (window.webSageLoaded) {
  console.log('WebSage already loaded, skipping initialization');
} else {
  window.webSageLoaded = true;

  // Escape untrusted text before it is interpolated into HTML templates.
  // User input, selected page text, and AI responses all flow through this
  // before reaching innerHTML (see formatMessage and the analysis previews).
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  // Shared copy-button icon (feather "copy" glyph). Kept as a single source
  // so the button keeps its SVG after a click instead of reverting to emoji.
  const COPY_ICON_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';

  // Intelligent Context Processor for optimized page analysis
  class IntelligentContextProcessor {
    constructor() {
      this.cache = new Map();
      this.compressionRatio = 0.3; // Target 30% of original content
    }

    // Fast hash function for content change detection
    simpleHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return hash.toString();
    }

    // Extract and prioritize content intelligently
    extractIntelligentContext(maxTokens = 1500) {
      const startTime = performance.now();

      // Get page metadata
      const title = document.title || '';
      const url = window.location.href;
      const contentHash = this.simpleHash(document.body.innerText);

      // Check cache first
      const cacheKey = `${url}_${contentHash}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      // Priority content extraction
      const context = {
        title,
        url: url.split('?')[0], // Remove query params
        keyContent: this.extractKeyContent(),
        summary: this.generateQuickSummary(),
        metadata: this.extractMetadata(),
        processingTime: 0
      };

      // Compress to fit token limit
      const compressed = this.compressContext(context, maxTokens);

      context.processingTime = performance.now() - startTime;

      // Cache result
      this.cache.set(cacheKey, compressed);

      // Limit cache size
      if (this.cache.size > 10) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }

      return compressed;
    }

    extractKeyContent() {
      const selectors = [
        'h1, h2, h3', // Headers
        'p:not(:empty)', // Paragraphs
        'article', // Articles
        'main', // Main content
        '[role="main"]', // ARIA main
        '.content, .post, .article', // Common content classes
        'blockquote', // Quotes
        'li' // List items
      ];

      const keyElements = [];

      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.innerText?.trim();
          if (text && text.length > 20 && text.length < 500) {
            keyElements.push({
              type: el.tagName.toLowerCase(),
              text: text,
              importance: this.calculateImportance(el)
            });
          }
        });
      });

      // Sort by importance and return top content
      return keyElements
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 15)
        .map(el => el.text);
    }

    calculateImportance(element) {
      let score = 0;
      const tag = element.tagName.toLowerCase();
      const text = element.innerText?.trim() || '';

      // Tag-based scoring
      const tagScores = {
        'h1': 10, 'h2': 8, 'h3': 6,
        'p': 3, 'article': 7, 'main': 8,
        'blockquote': 5, 'li': 2
      };
      score += tagScores[tag] || 1;

      // Position scoring (earlier = more important)
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight) score += 3; // Visible content
      if (rect.top < 200) score += 2; // Above fold

      // Length scoring (moderate length preferred)
      if (text.length > 50 && text.length < 300) score += 2;

      // Class/ID based scoring
      const className = element.className.toLowerCase();
      const id = element.id.toLowerCase();
      if (className.includes('title') || className.includes('heading')) score += 3;
      if (className.includes('content') || className.includes('main')) score += 2;
      if (id.includes('main') || id.includes('content')) score += 2;

      return score;
    }

    generateQuickSummary() {
      const paragraphs = Array.from(document.querySelectorAll('p'))
        .map(p => p.innerText?.trim())
        .filter(text => text && text.length > 50)
        .slice(0, 3);

      return paragraphs.join(' ').substring(0, 400);
    }

    extractMetadata() {
      const meta = {};

      // Common meta tags
      const metaTags = document.querySelectorAll('meta[name], meta[property]');
      metaTags.forEach(tag => {
        const name = tag.getAttribute('name') || tag.getAttribute('property');
        const content = tag.getAttribute('content');
        if (name && content) {
          if (name.includes('description') || name.includes('og:description')) {
            meta.description = content.substring(0, 200);
          }
          if (name.includes('keywords')) {
            meta.keywords = content.split(',').slice(0, 5).join(', ');
          }
        }
      });

      // Page type detection
      if (document.querySelector('article')) meta.type = 'article';
      else if (document.querySelector('form')) meta.type = 'form';
      else if (document.querySelector('table')) meta.type = 'data';
      else meta.type = 'page';

      return meta;
    }

    compressContext(context, maxTokens) {
      // Estimate tokens (rough: 1 token ≈ 4 characters)
      const estimateTokens = (text) => Math.ceil(text.length / 4);

      let compressed = {
        title: context.title,
        url: context.url,
        type: context.metadata.type,
        summary: context.summary
      };

      let currentTokens = estimateTokens(JSON.stringify(compressed));
      const remainingTokens = maxTokens - currentTokens;

      if (remainingTokens > 0 && context.keyContent.length > 0) {
        // Add key content until we hit the limit
        const keyContent = [];
        for (const content of context.keyContent) {
          const contentTokens = estimateTokens(content);
          if (currentTokens + contentTokens <= maxTokens) {
            keyContent.push(content);
            currentTokens += contentTokens;
          } else {
            break;
          }
        }
        compressed.keyContent = keyContent;
      }

      return compressed;
    }

    formatForAI(context) {
      let formatted = `Page: ${context.title}\nURL: ${context.url}\nType: ${context.type}\n\n`;

      if (context.summary) {
        formatted += `Summary: ${context.summary}\n\n`;
      }

      if (context.keyContent && context.keyContent.length > 0) {
        formatted += `Key Content:\n${context.keyContent.join('\n\n')}\n\n`;
      }

      return formatted.trim();
    }
  }

  // WebSage Chat Class - Enhanced with Advanced UI/UX Features
  class WebSageChat {
    constructor() {
      this.isVisible = false;
      this.chatHistory = [];
      this.settings = {};
      this.chatWindow = null;
      this.contextCache = new Map();
      this.pageMemory = {
        url: '',
        title: '',
        summary: '',
        keyPoints: [],
        lastUpdated: 0,
        contentHash: ''
      };
      this.intelligentContext = new IntelligentContextProcessor();
      // Initialize NLP processor - should be available since it's loaded as content script
      // NLP processor is removed in favor of real LLM API calls
      this.conversationInsights = {
        userPreferences: {},
        commonQuestions: [],
        helpfulResponses: [],
        sessionMetrics: {
          startTime: Date.now(),
          messageCount: 0,
          avgResponseTime: 0,
          userSatisfaction: 'unknown'
        }
      };
      this.floatingActionButton = null;
      this.shortcutsEnabled = true;
      this.messageQueue = [];
      this.isProcessing = false;

      this.init();
    }

    async init() {
      await this.loadSettings();

      // Ensure we have a valid theme before creating the chat window.
      // 'auto' is valid here — updateTheme() resolves it via matchMedia.
      if (!['light', 'dark', 'auto'].includes(this.settings.theme)) {
        // Detect system preference
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.settings.theme = prefersDark ? 'dark' : 'light';
        console.log('🎨 Auto-detected theme:', this.settings.theme);
      }

      this.createChatWindow();
      this.setupGlobalToggle();
      // NLP initialization removed
      this.createFloatingActionButton();
      this.setupKeyboardShortcuts();
      this.setupNotificationSystem();

      // Load saved conversation memory last: restoreConversation() renders
      // history into the chat window, which must exist first. Loading it
      // earlier crashed init() whenever history existed for this URL.
      await this.loadConversationMemory();
    }



    async loadSettings() {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.get(['webSageSettings'], (result) => {
            if (chrome.runtime.lastError) {
              console.warn('Chrome storage error:', chrome.runtime.lastError);
              this.settings = this.getDefaultSettings();
              resolve();
              return;
            }
            
            this.settings = result.webSageSettings || this.getDefaultSettings();
            resolve();
          });
        } catch (error) {
          console.warn('Extension context invalidated, using default settings:', error);
          this.settings = this.getDefaultSettings();
          resolve();
        }
      });
    }

    getDefaultSettings() {
      // Detect system theme preference
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      return {
        provider: 'openai',
        model: 'gpt-5.6-sol',
        contextEnabled: true,
        memoryEnabled: true,
        contextMode: 'intelligent',
        maxTokens: 1500,
        theme: prefersDark ? 'dark' : 'light',
        nlpEnabled: true,
        sentimentAnalysis: true,
        intentClassification: true,
        conversationInsights: true,
        apiKeys: {},
        // New UI/UX settings
        animationsEnabled: true,
        notificationsEnabled: true,
        autoResize: true,
        messageEffects: true,
        voiceInput: false,
        darkMode: prefersDark
      };
    }

    setupGlobalToggle() {
      // Receive commands from the background service worker. The content
      // script is declared in manifest content_scripts, so the background
      // messages this tab directly instead of re-injecting scripts.
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (!request || request.type !== 'websage-command') return;
        const command = request.command;
        const text = request.text || '';
        if (command === 'toggle') {
          this.toggle();
        } else {
          this.handleContextMenuAction(command, text);
        }
        sendResponse({ ok: true });
      });

      console.log('WebSage command receiver set up');
    }

    async handleContextMenuAction(action, text) {
      // Handle special actions that don't require chat
      if (action === 'analyze-page') {
        this.show();
        await new Promise(resolve => setTimeout(resolve, 100));
        this.analyzeCurrentPage();
        return;
      }

      if (action === 'check-credibility') {
        this.show();
        await new Promise(resolve => setTimeout(resolve, 100));
        this.checkPageCredibility();
        return;
      }

      // Handle text-based analysis actions
      if (action === 'check-fake-news' || action === 'detect-bias') {
        console.log('🔍 Fake news/bias detection requested');
        console.log('Selected text:', text?.substring(0, 100) + '...');

        this.show();
        await new Promise(resolve => setTimeout(resolve, 100));

        this.performTextAnalysisInChat(action, text);
        return;
      }

      // Ensure chat window is visible for regular actions
      if (!this.isVisible) {
        this.show();
      }

      // Wait a moment for the window to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      let message = '';
      switch (action) {
        case 'explain':
          message = `Please explain this text: "${text}"`;
          break;
        case 'summarize':
          message = `Please summarize this text: "${text}"`;
          break;
        case 'translate':
          message = `Please translate this text to English: "${text}"`;
          break;
        case 'analyze':
          message = `Please analyze the sentiment and tone of this text: "${text}"`;
          break;
        case 'toggle':
          return; // Just toggle, no message
        default:
          return;
      }

      // Set the message in the input and send it
      const input = this.chatWindow.querySelector('#websage-input');
      if (input && message) {
        input.value = message;
        this.autoResizeInput(input);
        // Auto-send the message
        setTimeout(() => this.sendMessage(), 100);
      }
    }

    async performTextAnalysisInChat(action, text) {
      if (!text) {
        this.showError('No text selected.');
        return;
      }

      try {
        let userMessage = `Analyze this text (${action}): "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`;
        this.addMessage('user', userMessage);
        this.showTyping();

        let analysis;
        let assistantMessage;

        if (action === 'check-fake-news') {
          analysis = await this.analyzeTextWithLLM(text, 'fake-news');
          assistantMessage = this.formatFakeNewsForChat(analysis, text);
        } else if (action === 'detect-bias') {
          analysis = await this.analyzeTextWithLLM(text, 'bias');
          assistantMessage = this.formatBiasForChat(analysis, text);
        }

        this.hideTyping();
        this.addMessage('assistant', assistantMessage);

      } catch (error) {
        console.error('Text analysis error:', error);
        this.showError('Analysis failed. Please try again.');
      }
    }

    // Ask the LLM to analyze text and return a structured JSON result.
    // The prompt demands raw JSON; the response is parsed leniently with a
    // fallback object so analysis never crashes the UI.
    async analyzeTextWithLLM(text, type) {
      let prompt = '';
      if (type === 'fake-news') {
        prompt = `Analyze the following text for fake news, clickbait, and misinformation patterns.
Return ONLY a raw JSON object (no markdown, no backticks) strictly matching this schema:
{
  "riskLevel": "critical|high|medium-high|medium|low-medium|low",
  "suspicionScore": 10,
  "confidence": 0.9,
  "indicators": ["list", "of", "detected", "issues"],
  "recommendation": "One sentence advice"
}

Text to analyze: "${text.substring(0, 1500)}"`;
      } else if (type === 'bias') {
        prompt = `Analyze the following text for political, emotional, or polarizing bias.
Return ONLY a raw JSON object (no markdown, no backticks) strictly matching this schema:
{
  "severity": "extreme|high|medium-high|medium|low-medium|low",
  "biasScore": 10,
  "confidence": 0.9,
  "biasTypes": ["list", "of", "bias", "types"],
  "recommendation": "One sentence advice"
}

Text to analyze: "${text.substring(0, 1500)}"`;
      } else if (type === 'credibility') {
        prompt = `Analyze the following webpage text for overall credibility, fake news risk, and bias.
Return ONLY a raw JSON object (no markdown, no backticks) strictly matching this schema:
{
  "credibilityScore": 75,
  "credibilityLevel": "High|Good|Moderate|Low|Very Low",
  "fakeNewsRisk": "critical|high|medium-high|medium|low-medium|low",
  "biasLevel": "extreme|high|medium-high|medium|low-medium|low",
  "assessment": "One paragraph assessment of credibility",
  "recommendations": ["list", "of", "actionable", "recommendations"]
}

Text to analyze: "${text.substring(0, 2000)}"`;
      }

      try {
        const responseText = await this.callAI(prompt, "");
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse LLM response', e);
        if (type === 'fake-news') {
          return { riskLevel: "medium", suspicionScore: 10, confidence: 0.5, indicators: ["Failed to analyze fully"], recommendation: "Analysis error." };
        } else if (type === 'bias') {
          return { severity: "medium", biasScore: 10, confidence: 0.5, biasTypes: ["unknown"], recommendation: "Analysis error." };
        } else if (type === 'credibility') {
          return { credibilityScore: 50, credibilityLevel: "Moderate", fakeNewsRisk: "medium", biasLevel: "medium", assessment: "Analysis error.", recommendations: ["Failed to analyze fully"] };
        }
        return {};
      }
    }

    formatFakeNewsForChat(analysis, text) {
      const riskEmoji = analysis.riskLevel === 'critical' ? '🚨' :
                       analysis.riskLevel === 'high' ? '⚠️' : 
                       analysis.riskLevel === 'medium-high' ? '🔍' :
                       analysis.riskLevel === 'medium' ? '⚡' : 
                       analysis.riskLevel === 'low-medium' ? '💡' : '✅';
      
      let message = `${riskEmoji} **FAKE NEWS ANALYSIS REPORT**\n\n`;
      message += `**📊 RISK ASSESSMENT**\n`;
      message += `• **Risk Level:** ${analysis.riskLevel.toUpperCase().replace('-', ' ')}\n`;
      message += `• **Suspicion Score:** ${analysis.suspicionScore}/30\n`;
      message += `• **Confidence:** ${Math.round(analysis.confidence * 100)}%\n`;
      
      if (analysis.analysisDetails) {
        message += `• **Text Length:** ${analysis.analysisDetails.wordCount} words, ${analysis.analysisDetails.sentenceCount} sentences\n`;
        message += `• **Credibility Score:** ${analysis.analysisDetails.credibilityScore}/10\n`;
      }
      
      message += `\n**🎯 RECOMMENDATION:**\n${analysis.recommendation}\n\n`;
      
      if (analysis.indicators && analysis.indicators.length > 0) {
        message += `**🔍 DETECTED ISSUES:**\n`;
        analysis.indicators.forEach(indicator => {
          message += `• ${indicator}\n`;
        });
        message += `\n`;
      }
      
      if (analysis.detectedPatterns && analysis.detectedPatterns.length > 0) {
        message += `**⚠️ MISINFORMATION PATTERNS:**\n`;
        const patternDescriptions = {
          'sensational_language': 'Sensational/exaggerated language',
          'clickbait': 'Clickbait headlines and phrases',
          'conspiracy': 'Conspiracy theory terminology',
          'emotional_manipulation': 'Emotional manipulation tactics',
          'unreliable_sourcing': 'Vague or unreliable source attribution',
          'medical_misinfo': 'Medical misinformation patterns',
          'poor_formatting': 'Unprofessional formatting',
          'credible_sources': 'Credible source references (positive)'
        };
        
        analysis.detectedPatterns.forEach(pattern => {
          const description = patternDescriptions[pattern] || pattern;
          message += `• ${description}\n`;
        });
        message += `\n`;
      }
      
      message += `**📚 FACT-CHECKING RESOURCES:**\n`;
      message += `• Snopes.com - Fact-checking and debunking\n`;
      message += `• FactCheck.org - Nonpartisan fact-checking\n`;
      message += `• PolitiFact.com - Political fact-checking\n`;
      message += `• Reuters Fact Check - News verification\n`;
      message += `• AP Fact Check - Associated Press verification\n\n`;
      
      message += `*Analysis powered by WebSage v3.0 Advanced NLP Engine*`;
      
      return message;
    }

    formatBiasForChat(analysis, text) {
      const biasEmoji = analysis.severity === 'extreme' ? '🚨' :
                       analysis.severity === 'high' ? '🔴' : 
                       analysis.severity === 'medium-high' ? '🟠' :
                       analysis.severity === 'medium' ? '🟡' : 
                       analysis.severity === 'low-medium' ? '🟢' : '✅';
      
      let message = `${biasEmoji} **BIAS ANALYSIS REPORT**\n\n`;
      message += `**📊 BIAS ASSESSMENT**\n`;
      message += `• **Bias Severity:** ${analysis.severity.toUpperCase().replace('-', ' ')}\n`;
      message += `• **Bias Score:** ${analysis.biasScore}/25\n`;
      message += `• **Confidence:** ${Math.round(analysis.confidence * 100)}%\n`;
      
      if (analysis.analysisDetails) {
        message += `• **Political Lean:** ${analysis.analysisDetails.politicalLean.charAt(0).toUpperCase() + analysis.analysisDetails.politicalLean.slice(1)}\n`;
        message += `• **Emotional Intensity:** ${analysis.analysisDetails.emotionalIntensity}/10\n`;
        message += `• **Balance Score:** ${analysis.analysisDetails.balanceScore}/10\n`;
      }
      
      message += `\n**🎯 RECOMMENDATION:**\n${analysis.recommendation}\n\n`;
      
      if (analysis.biasTypes && analysis.biasTypes.length > 0) {
        message += `**🔍 DETECTED BIAS TYPES:**\n`;
        const biasDescriptions = {
          'left-leaning': 'Left-leaning political perspective',
          'right-leaning': 'Right-leaning political perspective',
          'emotional': 'Emotional manipulation and loaded language',
          'loaded-language': 'Prejudicial and inflammatory terminology',
          'overgeneralizing': 'Absolute statements and overgeneralization',
          'stereotyping': 'Group stereotyping and generalizations',
          'polarizing': 'Divisive and polarizing language',
          'cherry-picking': 'Selective evidence presentation',
          'ad-hominem': 'Personal attacks and character assassination'
        };
        
        analysis.biasTypes.forEach(type => {
          const description = biasDescriptions[type] || type.replace('-', ' ');
          message += `• ${description}\n`;
        });
        message += `\n`;
      }
      
      if (analysis.indicators && analysis.indicators.length > 0) {
        message += `**⚠️ SPECIFIC INDICATORS:**\n`;
        analysis.indicators.forEach(indicator => {
          message += `• ${indicator}\n`;
        });
        message += `\n`;
      }
      
      if (analysis.biasTypes.length === 0) {
        message += `**✅ BALANCED CONTENT**\nThe text appears to be relatively neutral and balanced in its presentation.\n\n`;
      }
      
      message += `**📚 MEDIA LITERACY RESOURCES:**\n`;
      message += `• AllSides.com - Media bias ratings and balanced news\n`;
      message += `• MediaBiasFactCheck.com - Source bias and reliability\n`;
      message += `• Ground News - Multiple perspective news coverage\n`;
      message += `• Ad Fontes Media Chart - Media bias and reliability mapping\n`;
      message += `• Pew Research - Nonpartisan fact tank and polling\n\n`;
      
      message += `*Analysis powered by WebSage v3.0 Advanced NLP Engine*`;
      
      return message;
    }

    // Create floating action button for quick access
    createFloatingActionButton() {
      if (this.floatingActionButton) return;

      this.floatingActionButton = document.createElement('button');
      this.floatingActionButton.className = 'websage-fab';
      this.floatingActionButton.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;
      this.floatingActionButton.title = 'Open WebSage Chat';
      this.floatingActionButton.setAttribute('aria-label', 'Open WebSage chat');
      this.floatingActionButton.setAttribute('data-tooltip', 'Open WebSage Chat');

      document.body.appendChild(this.floatingActionButton);

      // Add click event
      this.floatingActionButton.addEventListener('click', () => {
        this.toggle();
      });

      // Add pulse animation for notifications
      if (this.settings.notificationsEnabled) {
        this.floatingActionButton.classList.add('websage-pulse');
      }
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
      // Alt+W to toggle WebSage
      document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === 'w' && this.shortcutsEnabled) {
          e.preventDefault();
          this.toggle();
        }
      });

      // Escape to close
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isVisible) {
          this.hide();
        }
      });
    }

    // Setup notification system
    setupNotificationSystem() {
      // Create notification container
      const notificationContainer = document.createElement('div');
      notificationContainer.id = 'websage-notifications';
      notificationContainer.setAttribute('aria-live', 'polite');
      notificationContainer.setAttribute('aria-atomic', 'false');
      notificationContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483648;
        pointer-events: none;
      `;
      document.body.appendChild(notificationContainer);

      // Store reference for notifications
      this.notificationContainer = notificationContainer;
    }

    // Show notification
    showNotification(message, type = 'info', duration = 3000) {
      if (!this.notificationContainer || !this.settings.notificationsEnabled) return;

      const notification = document.createElement('div');
      notification.className = `websage-notification websage-notification-${type}`;
      notification.style.cssText = `
        background: ${type === 'error' ? '#e53e3e' : type === 'success' ? '#38a169' : '#3182ce'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 14px;
        font-weight: 500;
        opacity: 0;
        transform: translateY(-20px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        pointer-events: auto;
        max-width: 320px;
        word-wrap: break-word;
      `;

      notification.textContent = message;
      this.notificationContainer.appendChild(notification);

      // Animate in
      setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
      }, 10);

      // Remove after duration
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }, duration);
    }

    // Perform text analysis for fake news and bias detection
    async performTextAnalysis(action, text) {
      if (!text) {
        this.showError('No text selected.');
        return;
      }

      const analysisPanel = this.chatWindow.querySelector('#websage-analysis');
      analysisPanel.style.display = 'block';

      try {
        let analysis;
        let title;
        let content;

        analysisPanel.innerHTML = '<div class="websage-analysis-loading">AI analyzing content...</div>';

        if (action === 'check-fake-news') {
          analysis = await this.analyzeTextWithLLM(text, 'fake-news');
          title = '🛡️ Fake News Detection Results';
          content = this.formatFakeNewsResults(analysis, text);
        } else if (action === 'detect-bias') {
          analysis = await this.analyzeTextWithLLM(text, 'bias');
          title = '⚖️ Bias Detection Results';
          content = this.formatBiasResults(analysis, text);
        }

        analysisPanel.innerHTML = `
          <div class="websage-analysis-results">
            <div class="websage-analysis-header">
              <h3>${title}</h3>
              <button class="websage-analysis-close" type="button" aria-label="Close analysis" title="Close">✕</button>
            </div>
            ${content}
          </div>
        `;

      } catch (error) {
        console.error('Text analysis error:', error);
        analysisPanel.innerHTML = '<div class="websage-analysis-error">❌ Analysis failed. Please try again.</div>';
      }
    }

    formatFakeNewsResults(analysis, text) {
      const riskColor = this.getRiskColor(analysis.riskLevel);

      return `
        <div class="websage-analysis-section">
          <div class="websage-selected-text">
            <strong>Analyzed Text:</strong>
            <div class="websage-text-preview">"${escapeHtml(text.substring(0, 200))}${text.length > 200 ? '...' : ''}"</div>
          </div>
        </div>

        <div class="websage-analysis-grid">
          <div class="websage-analysis-card">
            <div class="websage-analysis-title">Risk Level</div>
            <div class="websage-analysis-score" style="color: ${riskColor}">
              ${analysis.riskLevel.toUpperCase()}
            </div>
            <div class="websage-analysis-detail">
              Suspicion Score: ${analysis.suspicionScore}/20
            </div>
          </div>

          <div class="websage-analysis-card">
            <div class="websage-analysis-title">Confidence</div>
            <div class="websage-analysis-score">
              ${Math.round(analysis.confidence * 100)}%
            </div>
          </div>
        </div>

        <div class="websage-analysis-section">
          <div class="websage-analysis-subtitle">💡 Recommendation</div>
          <div class="websage-analysis-recommendation">
            ${analysis.recommendation}
          </div>
        </div>

        ${analysis.indicators.length > 0 ? `
        <div class="websage-analysis-section">
          <div class="websage-analysis-subtitle">⚠️ Detected Issues</div>
          <ul class="websage-analysis-issues">
            ${analysis.indicators.map(indicator => `<li>${indicator}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
      `;
    }

    formatBiasResults(analysis, text) {
      const biasColor = this.getSeverityColor(analysis.severity);

      return `
        <div class="websage-analysis-section">
          <div class="websage-selected-text">
            <strong>Analyzed Text:</strong>
            <div class="websage-text-preview">"${escapeHtml(text.substring(0, 200))}${text.length > 200 ? '...' : ''}"</div>
          </div>
        </div>

        <div class="websage-analysis-grid">
          <div class="websage-analysis-card">
            <div class="websage-analysis-title">Bias Severity</div>
            <div class="websage-analysis-score" style="color: ${biasColor}">
              ${analysis.severity.toUpperCase()}
            </div>
            <div class="websage-analysis-detail">
              Score: ${analysis.biasScore}
            </div>
          </div>

          <div class="websage-analysis-card">
            <div class="websage-analysis-title">Confidence</div>
            <div class="websage-analysis-score">
              ${Math.round(analysis.confidence * 100)}%
            </div>
          </div>
        </div>

        ${analysis.biasTypes.length > 0 ? `
        <div class="websage-analysis-section">
          <div class="websage-analysis-subtitle">🎯 Detected Bias Types</div>
          <div class="websage-analysis-tags">
            ${analysis.biasTypes.map(type =>
        `<span class="websage-analysis-tag">${type.replace('-', ' ')}</span>`
      ).join('')}
          </div>
        </div>
        ` : `
        <div class="websage-analysis-section">
          <div class="websage-analysis-subtitle">✅ No Significant Bias Detected</div>
          <p>The text appears to be relatively neutral and balanced.</p>
        </div>
        `}
      `;
    }

    // Check page credibility using comprehensive analysis
    async checkPageCredibility() {
      const analysisPanel = this.chatWindow.querySelector('#websage-analysis');
      analysisPanel.style.display = 'block';
      analysisPanel.innerHTML = '<div class="websage-analysis-loading">🏆 Checking page credibility...</div>';

      try {
        const pageText = document.body.innerText || document.body.textContent || '';

        if (pageText.length < 100) {
          analysisPanel.innerHTML = '<div class="websage-analysis-error">⚠️ Not enough content to analyze credibility</div>';
          return;
        }

        const analysis = await this.analyzeTextWithLLM(pageText, 'credibility');

        const credibilityColor = this.getQualityColor(analysis.credibilityScore);

        analysisPanel.innerHTML = `
          <div class="websage-analysis-results">
            <div class="websage-analysis-header">
              <h3>🏆 Page Credibility Assessment</h3>
              <button class="websage-analysis-close" type="button" aria-label="Close analysis" title="Close">✕</button>
            </div>
            
            <div class="websage-analysis-section">
              <div class="websage-credibility-score">
                <div class="websage-credibility-main">
                  <div class="websage-credibility-number" style="color: ${credibilityColor}">
                    ${analysis.credibilityScore}/100
                  </div>
                  <div class="websage-credibility-level">
                    ${analysis.credibilityLevel} Credibility
                  </div>
                </div>
              </div>
            </div>

            <div class="websage-analysis-grid">
              <div class="websage-analysis-card">
                <div class="websage-analysis-title">🛡️ Fake News Risk</div>
                <div class="websage-analysis-score" style="color: ${this.getRiskColor(analysis.fakeNewsRisk)}">
                  ${analysis.fakeNewsRisk.toUpperCase()}
                </div>
              </div>

              <div class="websage-analysis-card">
                <div class="websage-analysis-title">⚖️ Bias Level</div>
                <div class="websage-analysis-score" style="color: ${this.getSeverityColor(analysis.biasLevel)}">
                  ${analysis.biasLevel.toUpperCase()}
                </div>
              </div>
            </div>

            <div class="websage-analysis-section">
              <div class="websage-analysis-subtitle">💡 Assessment</div>
              <div class="websage-credibility-assessment">
                ${analysis.assessment}
              </div>
            </div>

            <div class="websage-analysis-section">
              <div class="websage-analysis-subtitle">🔍 Recommendations</div>
              <ul class="websage-analysis-recommendations">
                ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
            </div>
          </div>
        `;

      } catch (error) {
        console.error('Credibility analysis error:', error);
        analysisPanel.innerHTML = '<div class="websage-analysis-error">❌ Analysis failed. Please try again.</div>';
      }
    }

    createChatWindow() {
      if (this.chatWindow) return;

      this.chatWindow = document.createElement('div');
      this.chatWindow.id = 'websage-chat-window';
      
      // Ensure we have a valid theme
      if (!this.settings.theme || (this.settings.theme !== 'light' && this.settings.theme !== 'dark')) {
        this.settings.theme = 'light'; // Default to light mode
      }
      
      this.chatWindow.className = `websage-chat-window ${this.settings.theme}`;
      this.chatWindow.innerHTML = this.getChatWindowHTML();

      document.body.appendChild(this.chatWindow);
      this.setupEventListeners();
      this.makeDraggable();
      this.setupThemeDetection();
      
      console.log('🎨 Chat window created with theme:', this.settings.theme);
    }

    // Setup automatic theme detection and manual toggle
    setupThemeDetection() {
      // Listen for system theme changes
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addListener((e) => {
          if (this.settings.theme === 'auto') {
            this.updateTheme(e.matches ? 'dark' : 'light');
          }
        });
      }
    }

    // Update theme dynamically
    updateTheme(newTheme) {
      if (this.chatWindow) {
        // Determine actual theme to apply
        let actualTheme = newTheme;
        if (newTheme === 'auto') {
          const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          actualTheme = prefersDark ? 'dark' : 'light';
        }
        
        // Update the chat window className to include the theme
        this.chatWindow.className = `websage-chat-window ${actualTheme}`;
        
        // Update settings
        this.settings.theme = newTheme;
        this.saveSettings();
        
        // Update theme button
        this.updateThemeButton();
        
        console.log('🎨 Theme updated to:', newTheme, '(actual:', actualTheme + ')');
      }
    }

    // Toggle between light and dark themes
    toggleTheme() {
      const currentTheme = this.settings.theme;
      let newTheme;
      
      if (currentTheme === 'light') {
        newTheme = 'dark';
      } else if (currentTheme === 'dark') {
        newTheme = 'light'; // Simplified: just toggle between light and dark
      } else {
        newTheme = 'light';
      }
      
      this.updateTheme(newTheme);
      
      // Show theme change notification
      this.showThemeNotification(newTheme);
    }

    showThemeNotification(theme) {
      const status = this.chatWindow.querySelector('#websage-status');
      const themeEmoji = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🔄';
      const themeName = theme === 'auto' ? 'Auto (System)' : theme.charAt(0).toUpperCase() + theme.slice(1);
      
      status.textContent = `${themeEmoji} Theme: ${themeName}`;
      status.className = 'websage-status websage-info';
      
      setTimeout(() => {
        status.textContent = '';
        status.className = 'websage-status';
      }, 2000);
    }

    // Update theme button icon and tooltip
    updateThemeButton() {
      const themeBtn = this.chatWindow.querySelector('#websage-theme');
      if (themeBtn) {
        let icon, title;
        
        const icons = {
          sun: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
          moon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
          auto: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`
        };
        
        if (this.settings.theme === 'dark') {
          icon = icons.sun;
          title = 'Switch to Light Mode';
        } else if (this.settings.theme === 'light') {
          icon = icons.moon;
          title = 'Switch to Dark Mode';
        } else {
          icon = icons.auto;
          title = 'Switch to Auto Mode';
        }
        
        themeBtn.innerHTML = icon;
        themeBtn.title = title;
        themeBtn.setAttribute('aria-label', title);
      }
    }

    getChatWindowHTML() {
      const allProviders = [
        { value: 'openai', label: 'OpenAI' },
        { value: 'gemini', label: 'Google Gemini' },
        { value: 'mistral', label: 'Mistral AI' },
        { value: 'kilo', label: 'Kilo AI' }
      ];

      const apiKeys = this.settings.apiKeys || {};
      const configuredProviders = allProviders.filter(p => apiKeys[p.value]);
      
      let optionsHtml = '';
      if (configuredProviders.length > 0) {
        optionsHtml = configuredProviders.map(p => 
          `<option value="${p.value}">${p.label}</option>`
        ).join('\n              ');
      } else {
        optionsHtml = `<option value="">No providers configured</option>`;
      }

      return `
        <div class="websage-header">
          <div class="websage-title">
            WebSage
          </div>
          <div class="websage-performance" id="websage-performance"></div>
          <div class="websage-controls">
            <select id="websage-provider" class="websage-select" aria-label="AI provider">
              ${optionsHtml}
            </select>
            <button id="websage-theme" class="websage-btn-icon" type="button" aria-label="Toggle theme" title="Toggle theme"></button>
            <button id="websage-analyze" class="websage-btn-icon" type="button" aria-label="Analyze page" title="Analyze page">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
            <button id="websage-clear" class="websage-btn-icon" type="button" aria-label="Clear conversation" title="Clear conversation">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
            <button id="websage-close" class="websage-btn-icon" type="button" aria-label="Close WebSage chat" title="Close WebSage chat">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>
        <div class="websage-analysis" id="websage-analysis" style="display: none;"></div>
        <div class="websage-messages" id="websage-messages"></div>
        <div class="websage-input-container">
          <label class="websage-visually-hidden" for="websage-input">Ask WebSage about this page</label>
          <textarea 
            id="websage-input" 
            name="websage-input"
            placeholder="Ask me anything about this page..."
            rows="1"
          ></textarea>
          <button id="websage-send" class="websage-btn-send">Send</button>
        </div>
        <div class="websage-status" id="websage-status" aria-live="polite" aria-atomic="true"></div>
      `;
    }

    setupEventListeners() {
      // Delegated close handler for analysis panels. Replaces the inline
      // onclick attributes (blocked by extension/page CSP on strict sites).
      this.chatWindow.addEventListener('click', (e) => {
        if (!e.target || typeof e.target.closest !== 'function') return;
        if (e.target.closest('.websage-analysis-close')) {
          const panel = this.chatWindow.querySelector('#websage-analysis');
          if (panel) panel.style.display = 'none';
        }
      });

      const input = this.chatWindow.querySelector('#websage-input');
      const sendBtn = this.chatWindow.querySelector('#websage-send');
      const themeBtn = this.chatWindow.querySelector('#websage-theme');
      const analyzeBtn = this.chatWindow.querySelector('#websage-analyze');
      const clearBtn = this.chatWindow.querySelector('#websage-clear');
      const closeBtn = this.chatWindow.querySelector('#websage-close');
      const providerSelect = this.chatWindow.querySelector('#websage-provider');

      // Set current provider
      providerSelect.value = this.settings.provider;

      // Update theme button icon based on current theme
      this.updateThemeButton();

      // Send message
      sendBtn.addEventListener('click', () => this.sendMessage());

      // Toggle theme
      themeBtn.addEventListener('click', () => this.toggleTheme());

      // Analyze page
      analyzeBtn.addEventListener('click', () => this.analyzeCurrentPage());

      // Input handling
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      input.addEventListener('input', () => {
        this.autoResizeInput(input);
      });

      // Clear chat
      clearBtn.addEventListener('click', () => this.clearChat());

      // Close window
      closeBtn.addEventListener('click', () => this.hide());

      // Provider change
      providerSelect.addEventListener('change', (e) => {
        this.settings.provider = e.target.value;
        this.saveSettings();
      });
    }

    autoResizeInput(input) {
      if (!this.settings.autoResize) return;
      
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    }

    makeDraggable() {
      const header = this.chatWindow.querySelector('.websage-header');
      let isDragging = false;
      let currentX, currentY, initialX, initialY;

      header.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;

        isDragging = true;
        initialX = e.clientX - this.chatWindow.offsetLeft;
        initialY = e.clientY - this.chatWindow.offsetTop;

        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
      });

      const drag = (e) => {
        if (!isDragging) return;

        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        this.chatWindow.style.left = currentX + 'px';
        this.chatWindow.style.top = currentY + 'px';
      };

      const stopDrag = () => {
        isDragging = false;
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
      };
    }

    toggle() {
      if (this.isVisible) {
        this.hide();
      } else {
        this.show();
      }
    }

    show() {
      this.chatWindow.style.display = 'flex';
      this.isVisible = true;

      // Focus input
      setTimeout(() => {
        const input = this.chatWindow.querySelector('#websage-input');
        input.focus();
      }, 100);

      // Show notification
      if (this.settings.notificationsEnabled) {
        this.showNotification('WebSage chat opened', 'info', 2000);
      }
    }

    hide() {
      this.chatWindow.style.display = 'none';
      this.isVisible = false;

      // Hide FAB tooltip if visible
      if (this.floatingActionButton) {
        this.floatingActionButton.classList.remove('websage-pulse');
      }
    }

    async sendMessage() {
      const input = this.chatWindow.querySelector('#websage-input');
      const message = input.value.trim();

      if (!message) return;

      // Refresh settings to ensure we have the latest API keys
      await this.loadSettings();

      // Check API key with better validation
      const apiKey = this.settings.apiKeys && this.settings.apiKeys[this.settings.provider];
      if (!apiKey || apiKey.trim() === '') {
        this.showError(`Please set up your ${this.settings.provider.toUpperCase()} API key in the extension settings.`);
        return;
      }

      // Update session metrics
      this.conversationInsights.sessionMetrics.messageCount++;

      // Add user message
      this.addMessage('user', message);
      input.value = '';
      this.autoResizeInput(input);

      // Show typing indicator
      this.showTyping();

      const startTime = performance.now();
      let contextTime = 0;

      try {
        let context = '';
        if (this.settings.contextEnabled) {
          const contextStart = performance.now();
          context = this.getEnhancedPageContext();
          contextTime = performance.now() - contextStart;
        }

        const response = await this.callAI(message, context);
        const totalTime = performance.now() - startTime;

        this.hideTyping();
        this.addMessage('assistant', response);

        // Update performance indicator
        this.updatePerformanceIndicator(contextTime, totalTime - contextTime);

        // Update session metrics
        this.conversationInsights.sessionMetrics.avgResponseTime =
          (this.conversationInsights.sessionMetrics.avgResponseTime + (totalTime - contextTime)) / 2;

      } catch (error) {
        this.hideTyping();
        this.showError('Failed to get AI response: ' + error.message);
      }
    }

    updatePerformanceIndicator(contextTime, apiTime) {
      const perfElement = this.chatWindow.querySelector('#websage-performance');
      if (perfElement) {
        const contextMs = Math.round(contextTime);
        const apiMs = Math.round(apiTime);
        perfElement.textContent = `${contextMs}ms + ${apiMs}ms`;
        perfElement.title = `Context processing: ${contextMs}ms, API response: ${apiMs}ms`;
      }
    }

    getEnhancedPageContext() {
      if (!this.settings.contextEnabled) return '';
      return this.getPageContext();
    }

    addMessage(role, content, nlpAnalysis = null) {
      this.addMessageToUI(role, content, true, nlpAnalysis);
    }

    addMessageToUI(role, content, saveToHistory = true, nlpAnalysis = null) {
      const messagesContainer = this.chatWindow.querySelector('#websage-messages');
      const messageDiv = document.createElement('div');
      messageDiv.className = `websage-message websage-message-${role}`;

      // Add timestamp
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      messageDiv.innerHTML = `
        <div class="websage-message-content">${this.formatMessage(content)}</div>
        ${role === 'assistant' ? `<button class="websage-copy-btn" type="button" aria-label="Copy response" title="Copy response">${COPY_ICON_SVG}</button>` : ''}
        <div class="websage-message-time">${timestamp}</div>
      `;

      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      // Add copy functionality
      if (role === 'assistant') {
        const copyBtn = messageDiv.querySelector('.websage-copy-btn');
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(content);
          copyBtn.innerHTML = '✓';
          setTimeout(() => copyBtn.innerHTML = COPY_ICON_SVG, 1000);
        });
      }

      if (saveToHistory) {
        this.chatHistory.push({ role, content, timestamp });
        // Auto-save conversation memory after each message
        this.saveConversationMemory();
      }
    }

    formatMessage(content) {
      // Escape first, then apply markdown-like formatting. The <strong>/<em>/<code>
      // tags injected below are the only HTML that reaches the DOM; the captured
      // text inside them is already escaped, so untrusted input cannot inject
      // elements or event handlers.
      return escapeHtml(content)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
    }

    showTyping() {
      const messagesContainer = this.chatWindow.querySelector('#websage-messages');
      const typingDiv = document.createElement('div');
      typingDiv.id = 'websage-typing';
      typingDiv.className = 'websage-message websage-message-assistant';
      typingDiv.innerHTML = '<div class="websage-typing-indicator">AI is thinking...</div>';

      messagesContainer.appendChild(typingDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTyping() {
      const typing = this.chatWindow.querySelector('#websage-typing');
      if (typing) typing.remove();
    }

    showError(message) {
      const status = this.chatWindow.querySelector('#websage-status');
      status.textContent = message;
      status.className = 'websage-status websage-error';

      setTimeout(() => {
        status.textContent = '';
        status.className = 'websage-status';
      }, 5000);
    }

    clearChat() {
      if (!window.confirm('Clear this page’s WebSage conversation? This cannot be undone.')) return;
      const messagesContainer = this.chatWindow.querySelector('#websage-messages');
      messagesContainer.innerHTML = '';
      this.chatHistory = [];

      // Clear memory for this page
      const url = window.location.href.split('?')[0];
      const storageKey = `websage_memory_${this.simpleHash(url)}`;
      chrome.storage.local.remove([storageKey]);

      // Clear context cache
      this.intelligentContext.cache.clear();

      // Hide analysis panel
      const analysisPanel = this.chatWindow.querySelector('#websage-analysis');
      if (analysisPanel) {
        analysisPanel.style.display = 'none';
      }

      // Show notification
      if (this.settings.notificationsEnabled) {
        this.showNotification('Chat cleared', 'info', 2000);
      }
    }

    // Analyze current page for fake news, bias, and quality via the LLM
    async analyzeCurrentPage() {
      await this.checkPageCredibility();
    }

    getRiskColor(riskLevel) {
      switch (riskLevel) {
        case 'high': return '#e53e3e';
        case 'medium': return '#dd6b20';
        case 'low-medium': return '#d69e2e';
        default: return '#38a169';
      }
    }

    getSeverityColor(severity) {
      switch (severity) {
        case 'high': return '#e53e3e';
        case 'medium': return '#dd6b20';
        default: return '#38a169';
      }
    }

    getQualityColor(score) {
      if (score >= 80) return '#38a169';
      if (score >= 60) return '#3182ce';
      return '#e53e3e';
    }

    async saveSettings() {
      chrome.storage.local.set({ webSageSettings: this.settings });
    }

    getPageContext() {
      if (!this.settings.contextEnabled) return '';

      const maxTokens = this.settings.maxTokens || 1500;

      switch (this.settings.contextMode) {
        case 'intelligent':
          const context = this.intelligentContext.extractIntelligentContext(maxTokens);
          return this.intelligentContext.formatForAI(context);

        case 'full':
          // Full page content (legacy mode)
          const textContent = document.body.innerText || document.body.textContent || '';
          if (textContent.length > maxTokens * 4) { // Rough token estimation
            return textContent.substring(0, maxTokens * 4) + '...';
          }
          return textContent;

        case 'minimal':
          // Just title and basic info
          return `Page: ${document.title}\nURL: ${window.location.href.split('?')[0]}`;

        default:
          return this.intelligentContext.formatForAI(
            this.intelligentContext.extractIntelligentContext(maxTokens)
          );
      }
    }

    // Enhanced memory system for persistent conversations
    async loadConversationMemory() {
      const url = window.location.href.split('?')[0]; // Remove query params
      const storageKey = `websage_memory_${this.simpleHash(url)}`;

      return new Promise((resolve) => {
        chrome.storage.local.get([storageKey], (result) => {
          const memory = result[storageKey];
          // lastActive is the current shape; timestamp covers entries written
          // by older versions of the extension.
          const lastSeen = memory && (memory.lastActive || memory.timestamp);
          if (memory && Date.now() - lastSeen < 24 * 60 * 60 * 1000) { // 24 hours
            this.chatHistory = memory.chatHistory || [];
            this.pageMemory = memory.pageMemory || this.pageMemory;
            this.restoreConversation();
          }
          resolve();
        });
      });
    }

    async saveConversationMemory() {
      const url = window.location.href.split('?')[0];
      const storageKey = `websage_memory_${this.simpleHash(url)}`;
      const lastActive = Date.now();

      const memory = {
        chatHistory: this.chatHistory.slice(-50), // Keep last 50 messages
        pageMemory: this.pageMemory,
        timestamp: lastActive,
        lastActive,
        url
      };

      await chrome.storage.local.set({ [storageKey]: memory });
      await this.pruneConversationMemory(storageKey, url, lastActive);
    }

    // Bound total stored conversations: at most MAX_MEMORY_URLS sites are kept,
    // most recently used first. Older entries are evicted from storage.
    async pruneConversationMemory(currentKey, currentUrl, lastActive) {
      const MAX_MEMORY_URLS = 50;
      const INDEX_KEY = 'websage_memory_index';

      const { [INDEX_KEY]: index } = await chrome.storage.local.get([INDEX_KEY]);
      const entries = (index || []).filter((e) => e.key !== currentKey);
      entries.push({ key: currentKey, url: currentUrl, lastActive });
      entries.sort((a, b) => b.lastActive - a.lastActive);

      const kept = entries.slice(0, MAX_MEMORY_URLS);
      const evicted = entries.slice(MAX_MEMORY_URLS);

      await chrome.storage.local.set({ [INDEX_KEY]: kept });
      if (evicted.length > 0) {
        // remove() is required — set(key, null) does not delete on all Chrome builds.
        await chrome.storage.local.remove(evicted.map((e) => e.key));
      }
    }

    restoreConversation() {
      const messagesContainer = this.chatWindow.querySelector('#websage-messages');
      messagesContainer.innerHTML = '';

      this.chatHistory.forEach(msg => {
        this.addMessageToUI(msg.role, msg.content, false); // Don't save to history again
      });
    }

    simpleHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString();
    }

    async callAI(message, context) {
      const { provider } = this.settings;
      const apiKey = this.settings.apiKeys[provider];

      switch (provider) {
        case 'openai':
          return this.callOpenAI(message, context, apiKey);
        case 'gemini':
          return this.callGemini(message, context, apiKey);
        case 'mistral':
          return this.callMistral(message, context, apiKey);
        case 'kilo':
          return this.callKilo(message, context, apiKey);
        default:
          throw new Error('Unknown AI provider');
      }
    }

    async proxyFetch(url, options) {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'websage-api-fetch',
          url,
          options
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve({
            ok: response.ok,
            status: response.status,
            text: async () => response.text,
            json: async () => JSON.parse(response.text)
          });
        });
      });
    }

    async callOpenAI(message, context, apiKey) {
      const messages = [
        ...(context ? [{ role: 'system', content: `Page context: ${context}` }] : []),
        ...this.chatHistory.slice(-10), // Last 10 messages for context
        { role: 'user', content: message }
      ];

      // Retry logic for rate limiting
      const maxRetries = 3;
      let retryDelay = 1000;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await this.proxyFetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: this.settings.model || 'gpt-5.6-sol',
              messages,
              max_tokens: 1000,
              temperature: 0.7
            })
          });

          if (response.status === 429) {
            if (attempt < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              retryDelay *= 2;
              continue;
            }
            throw new Error(`Rate limit exceeded. Please wait a moment and try again.`);
          }

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          return data.choices[0].message.content;
        } catch (error) {
          if (attempt === maxRetries - 1) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    async callGemini(message, context, apiKey) {
      const prompt = context ? `Context: ${context}\n\nQuestion: ${message}` : message;
      const model = this.settings.model || 'gemini-3.6-flash';

      // Retry logic for rate limiting
      const maxRetries = 3;
      let retryDelay = 1000; // Start with 1 second

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await this.proxyFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }]
              }]
            })
          });

          if (response.status === 429) {
            // Rate limited - wait and retry
            if (attempt < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              retryDelay *= 2; // Exponential backoff
              continue;
            }
            throw new Error(`Rate limit exceeded. Please wait a moment and try again.`);
          }

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();

          if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response from Gemini API');
          }

          return data.candidates[0].content.parts[0].text;
        } catch (error) {
          if (attempt === maxRetries - 1) {
            throw error;
          }
          // Wait before retrying on other errors too
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    async callMistral(message, context, apiKey) {
      const messages = [
        ...(context ? [{ role: 'system', content: `Page context: ${context}` }] : []),
        ...this.chatHistory.slice(-10),
        { role: 'user', content: message }
      ];

      // Retry logic for rate limiting
      const maxRetries = 3;
      let retryDelay = 1000;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await this.proxyFetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: this.settings.model || 'mistral-medium-latest',
              messages,
              max_tokens: 1000,
              temperature: 0.7
            })
          });

          if (response.status === 429) {
            if (attempt < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              retryDelay *= 2;
              continue;
            }
            throw new Error(`Rate limit exceeded. Please wait a moment and try again.`);
          }

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          return data.choices[0].message.content;
        } catch (error) {
          if (attempt === maxRetries - 1) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    async callKilo(message, context, apiKey) {
      const messages = [
        ...(context ? [{ role: 'system', content: `Page context: ${context}` }] : []),
        ...this.chatHistory.slice(-10),
        { role: 'user', content: message }
      ];

      // Kilo AI Gateway — OpenAI-compatible chat completions endpoint.
      // Retry logic for rate limiting (~200 req/hr on the free tier).
      const maxRetries = 3;
      let retryDelay = 1000;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await this.proxyFetch('https://api.kilo.ai/api/gateway/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: this.settings.model || 'anthropic/claude-sonnet-4.5',
              messages,
              max_tokens: 1000,
              temperature: 0.7
            })
          });

          if (response.status === 429) {
            if (attempt < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              retryDelay *= 2;
              continue;
            }
            throw new Error(`Rate limit exceeded. Please wait a moment and try again.`);
          }

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Kilo API error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          return data.choices[0].message.content;
        } catch (error) {
          if (attempt === maxRetries - 1) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
  }

  // Initialize WebSage when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('🚀 WebSage initializing on DOMContentLoaded');
      new WebSageChat();
    });
  } else {
    console.log('🚀 WebSage initializing immediately');
    new WebSageChat();
  }
}
