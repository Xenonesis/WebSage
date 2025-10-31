// Google Services Integration Module for WebSage
// Comprehensive Google Cloud Platform services integration

class GoogleServicesManager {
  constructor() {
    this.apiKeys = {
      gemini: '',
      cloudTranslation: '',
      naturalLanguage: '',
      factCheck: '',
      customSearch: '',
      customSearchEngineId: '',
      safeBrowsing: ''
    };
    
    this.endpoints = {
      gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
      translation: 'https://translation.googleapis.com/language/translate/v2',
      naturalLanguage: 'https://language.googleapis.com/v1',
      factCheck: 'https://factchecktools.googleapis.com/v1alpha1',
      customSearch: 'https://www.googleapis.com/customsearch/v1',
      safeBrowsing: 'https://safebrowsing.googleapis.com/v4'
    };
    
    this.cache = new Map();
    this.cacheExpiry = 3600000; // 1 hour
  }

  // Initialize with API keys from storage
  async initialize() {
    try {
      const result = await chrome.storage.local.get(['googleApiKeys']);
      if (result.googleApiKeys) {
        this.apiKeys = { ...this.apiKeys, ...result.googleApiKeys };
      }
    } catch (error) {
      console.error('Failed to load Google API keys:', error);
    }
  }

  // Save API keys to storage
  async saveApiKeys(keys) {
    try {
      this.apiKeys = { ...this.apiKeys, ...keys };
      await chrome.storage.local.set({ googleApiKeys: this.apiKeys });
    } catch (error) {
      console.error('Failed to save Google API keys:', error);
    }
  }

  // ========== GOOGLE GEMINI API ==========
  async generateWithGemini(prompt, model = 'gemini-2.0-flash-exp', options = {}) {
    if (!this.apiKeys.gemini) {
      throw new Error('Google Gemini API key not configured');
    }

    const url = `${this.endpoints.gemini}/${model}:generateContent?key=${this.apiKeys.gemini}`;
    
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: options.temperature || 0.7,
        topK: options.topK || 40,
        topP: options.topP || 0.95,
        maxOutputTokens: options.maxOutputTokens || 2048,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return {
        text: data.candidates[0]?.content?.parts[0]?.text || '',
        model: model,
        finishReason: data.candidates[0]?.finishReason,
        safetyRatings: data.candidates[0]?.safetyRatings
      };
    } catch (error) {
      console.error('Gemini API request failed:', error);
      throw error;
    }
  }

  // ========== GOOGLE CLOUD TRANSLATION API ==========
  async translateText(text, targetLanguage = 'en', sourceLanguage = null) {
    if (!this.apiKeys.cloudTranslation) {
      throw new Error('Google Cloud Translation API key not configured');
    }

    const cacheKey = `translate_${text}_${targetLanguage}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const url = `${this.endpoints.translation}?key=${this.apiKeys.cloudTranslation}`;
    
    const requestBody = {
      q: text,
      target: targetLanguage,
      format: 'text'
    };
    
    if (sourceLanguage) {
      requestBody.source = sourceLanguage;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.statusText}`);
      }

      const data = await response.json();
      const result = {
        translatedText: data.data.translations[0].translatedText,
        detectedSourceLanguage: data.data.translations[0].detectedSourceLanguage,
        originalText: text
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Translation API request failed:', error);
      throw error;
    }
  }

  async detectLanguage(text) {
    if (!this.apiKeys.cloudTranslation) {
      throw new Error('Google Cloud Translation API key not configured');
    }

    const url = `${this.endpoints.translation}/detect?key=${this.apiKeys.cloudTranslation}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: text })
      });

      if (!response.ok) {
        throw new Error(`Language detection error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        language: data.data.detections[0][0].language,
        confidence: data.data.detections[0][0].confidence,
        isReliable: data.data.detections[0][0].isReliable
      };
    } catch (error) {
      console.error('Language detection failed:', error);
      throw error;
    }
  }

  // ========== GOOGLE CLOUD NATURAL LANGUAGE API ==========
  async analyzeWithNaturalLanguage(text, features = ['sentiment', 'entities', 'syntax']) {
    if (!this.apiKeys.naturalLanguage) {
      throw new Error('Google Cloud Natural Language API key not configured');
    }

    const cacheKey = `nlp_${text.substring(0, 100)}_${features.join(',')}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const url = `${this.endpoints.naturalLanguage}/documents:annotateText?key=${this.apiKeys.naturalLanguage}`;
    
    const requestBody = {
      document: {
        type: 'PLAIN_TEXT',
        content: text,
        language: 'en'
      },
      features: {
        extractEntities: features.includes('entities'),
        extractDocumentSentiment: features.includes('sentiment'),
        extractSyntax: features.includes('syntax'),
        classifyText: features.includes('classification')
      },
      encodingType: 'UTF8'
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Natural Language API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      const result = {
        sentiment: data.documentSentiment ? {
          score: data.documentSentiment.score, // -1.0 to 1.0
          magnitude: data.documentSentiment.magnitude, // 0.0 to infinity
          label: this.getSentimentLabel(data.documentSentiment.score)
        } : null,
        entities: data.entities ? data.entities.map(entity => ({
          name: entity.name,
          type: entity.type,
          salience: entity.salience,
          mentions: entity.mentions?.length || 0,
          metadata: entity.metadata
        })) : [],
        language: data.language,
        categories: data.categories || []
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Natural Language API request failed:', error);
      throw error;
    }
  }

  getSentimentLabel(score) {
    if (score >= 0.25) return 'positive';
    if (score <= -0.25) return 'negative';
    return 'neutral';
  }

  // ========== GOOGLE FACT CHECK TOOLS API ==========
  async checkFactsWithGoogle(query, languageCode = 'en') {
    if (!this.apiKeys.factCheck) {
      throw new Error('Google Fact Check Tools API key not configured');
    }

    const cacheKey = `factcheck_${query}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const url = `${this.endpoints.factCheck}/claims:search?key=${this.apiKeys.factCheck}&query=${encodeURIComponent(query)}&languageCode=${languageCode}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Fact Check API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      const result = {
        claims: data.claims ? data.claims.map(claim => ({
          text: claim.text,
          claimant: claim.claimant,
          claimDate: claim.claimDate,
          claimReview: claim.claimReview.map(review => ({
            publisher: review.publisher?.name || 'Unknown',
            url: review.url,
            title: review.title,
            reviewDate: review.reviewDate,
            textualRating: review.textualRating,
            languageCode: review.languageCode
          }))
        })) : [],
        hasFactChecks: data.claims && data.claims.length > 0
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Fact Check API request failed:', error);
      throw error;
    }
  }

  // ========== GOOGLE CUSTOM SEARCH API ==========
  async searchWithGoogle(query, options = {}) {
    if (!this.apiKeys.customSearch || !this.apiKeys.customSearchEngineId) {
      throw new Error('Google Custom Search API key or Engine ID not configured');
    }

    const params = new URLSearchParams({
      key: this.apiKeys.customSearch,
      cx: this.apiKeys.customSearchEngineId,
      q: query,
      num: options.num || 10,
      start: options.start || 1
    });

    if (options.siteSearch) {
      params.append('siteSearch', options.siteSearch);
    }

    const url = `${this.endpoints.customSearch}?${params.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Custom Search API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        searchInformation: data.searchInformation,
        items: data.items ? data.items.map(item => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet,
          displayLink: item.displayLink
        })) : [],
        totalResults: data.searchInformation?.totalResults || 0
      };
    } catch (error) {
      console.error('Custom Search API request failed:', error);
      throw error;
    }
  }

  // ========== GOOGLE SAFE BROWSING API ==========
  async checkUrlSafety(url) {
    if (!this.apiKeys.safeBrowsing) {
      throw new Error('Google Safe Browsing API key not configured');
    }

    const cacheKey = `safebrowsing_${url}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const apiUrl = `${this.endpoints.safeBrowsing}/threatMatches:find?key=${this.apiKeys.safeBrowsing}`;
    
    const requestBody = {
      client: {
        clientId: 'websage',
        clientVersion: '5.0.0'
      },
      threatInfo: {
        threatTypes: [
          'MALWARE',
          'SOCIAL_ENGINEERING',
          'UNWANTED_SOFTWARE',
          'POTENTIALLY_HARMFUL_APPLICATION'
        ],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url: url }]
      }
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Safe Browsing API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      const result = {
        isSafe: !data.matches || data.matches.length === 0,
        threats: data.matches ? data.matches.map(match => ({
          threatType: match.threatType,
          platformType: match.platformType,
          threatEntryType: match.threatEntryType
        })) : [],
        url: url
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Safe Browsing API request failed:', error);
      throw error;
    }
  }

  // ========== ENHANCED FACT CHECKING WITH MULTIPLE SOURCES ==========
  async performComprehensiveFactCheck(text) {
    const results = {
      googleFactCheck: null,
      credibleSources: null,
      nlpAnalysis: null,
      summary: null
    };

    try {
      // 1. Google Fact Check API
      if (this.apiKeys.factCheck) {
        results.googleFactCheck = await this.checkFactsWithGoogle(text);
      }

      // 2. Search credible news sources
      if (this.apiKeys.customSearch) {
        const credibleSites = 'reuters.com OR apnews.com OR bbc.com OR factcheck.org OR snopes.com';
        results.credibleSources = await this.searchWithGoogle(text, { 
          num: 5,
          siteSearch: credibleSites 
        });
      }

      // 3. NLP Analysis for bias and sentiment
      if (this.apiKeys.naturalLanguage) {
        results.nlpAnalysis = await this.analyzeWithNaturalLanguage(text, ['sentiment', 'entities']);
      }

      // 4. Generate summary
      results.summary = this.generateFactCheckSummary(results);

    } catch (error) {
      console.error('Comprehensive fact check failed:', error);
      results.error = error.message;
    }

    return results;
  }

  generateFactCheckSummary(results) {
    const summary = {
      hasFactChecks: false,
      credibilityScore: 50, // 0-100
      recommendations: [],
      sources: []
    };

    if (results.googleFactCheck?.hasFactChecks) {
      summary.hasFactChecks = true;
      summary.credibilityScore += 20;
      summary.sources.push(...results.googleFactCheck.claims.map(c => c.claimReview).flat());
    }

    if (results.credibleSources?.totalResults > 0) {
      summary.credibilityScore += 15;
      summary.sources.push(...results.credibleSources.items);
    }

    if (results.nlpAnalysis) {
      const sentiment = results.nlpAnalysis.sentiment;
      if (sentiment && Math.abs(sentiment.score) > 0.5) {
        summary.credibilityScore -= 10; // High emotional content reduces credibility
        summary.recommendations.push('Content shows strong emotional language');
      }
    }

    summary.credibilityScore = Math.max(0, Math.min(100, summary.credibilityScore));

    return summary;
  }

  // ========== CACHE MANAGEMENT ==========
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });

    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

// Make it globally available
window.GoogleServicesManager = GoogleServicesManager;
