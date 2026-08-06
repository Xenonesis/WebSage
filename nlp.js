// WebSage NLP engine — pure JavaScript with no browser or extension APIs.
// Runs identically as an extension content script (defines
// window.AdvancedNLPProcessor) and under Node for tests (module.exports).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AdvancedNLPProcessor = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class AdvancedNLPProcessor {
    constructor() {
      console.log('✨ AdvancedNLPProcessor constructor called');
      this.fakeNewsCache = new Map();
    }

    detectFakeNews(text) {
      console.log('🔍 Analyzing text for fake news:', text.substring(0, 50) + '...');
      
      const lowerText = text.toLowerCase();
      let suspicionScore = 0;
      const indicators = [];
      const detectedPatterns = [];

      // Advanced sensational language detection
      const sensationalWords = [
        'shocking', 'unbelievable', 'incredible', 'amazing', 'stunning', 'outrageous',
        'explosive', 'bombshell', 'devastating', 'mind-blowing', 'jaw-dropping',
        'unprecedented', 'revolutionary', 'groundbreaking', 'earth-shattering',
        'life-changing', 'miraculous', 'forbidden', 'secret', 'hidden', 'exposed',
        'revealed', 'uncovered', 'leaked', 'exclusive', 'breaking', 'urgent'
      ];
      
      const sensationalCount = sensationalWords.filter(word => lowerText.includes(word)).length;
      if (sensationalCount > 0) {
        const score = Math.min(sensationalCount * 2, 12);
        suspicionScore += score;
        indicators.push(`Sensational language detected (${sensationalCount} instances)`);
        detectedPatterns.push('sensational_language');
      }

      // Advanced clickbait detection
      const clickbaitPhrases = [
        'you won\'t believe', 'what happens next', 'doctors hate', 'this one trick',
        'the results will surprise you', 'don\'t want you to know', 'will shock you',
        'number [0-9]+ will', 'wait until you see', 'gone wrong', 'gone right',
        'what happened next', 'the reason why', 'this is why', 'here\'s why',
        'you need to see', 'must see', 'watch what happens', 'the truth about',
        'they tried to hide', 'mainstream media', 'big pharma', 'government doesn\'t want'
      ];
      
      let clickbaitCount = 0;
      clickbaitPhrases.forEach(phrase => {
        const regex = new RegExp(phrase.replace(/\[0-9\]\+/g, '\\d+'), 'gi');
        if (regex.test(lowerText)) clickbaitCount++;
      });
      
      if (clickbaitCount > 0) {
        const score = Math.min(clickbaitCount * 4, 16);
        suspicionScore += score;
        indicators.push(`Clickbait patterns detected (${clickbaitCount} instances)`);
        detectedPatterns.push('clickbait');
      }

      // Conspiracy theory indicators
      const conspiracyTerms = [
        'deep state', 'new world order', 'illuminati', 'cover-up', 'conspiracy',
        'they don\'t want you to know', 'wake up', 'sheeple', 'false flag',
        'inside job', 'controlled opposition', 'puppet masters', 'shadow government',
        'mainstream media lies', 'fake news media', 'propaganda', 'brainwashed'
      ];
      
      const conspiracyCount = conspiracyTerms.filter(term => lowerText.includes(term)).length;
      if (conspiracyCount > 0) {
        const score = Math.min(conspiracyCount * 5, 20);
        suspicionScore += score;
        indicators.push(`Conspiracy theory language (${conspiracyCount} instances)`);
        detectedPatterns.push('conspiracy');
      }

      // Emotional manipulation detection
      const emotionalWords = [
        'terrifying', 'horrifying', 'disgusting', 'outraged', 'furious',
        'devastated', 'heartbroken', 'betrayed', 'abandoned', 'forgotten',
        'dangerous', 'deadly', 'toxic', 'poisonous', 'harmful', 'threatening',
        'scary', 'frightening', 'alarming', 'disturbing', 'shocking'
      ];
      
      const emotionalCount = emotionalWords.filter(word => lowerText.includes(word)).length;
      if (emotionalCount > 2) {
        const score = Math.min((emotionalCount - 2) * 2, 10);
        suspicionScore += score;
        indicators.push(`Emotional manipulation detected (${emotionalCount} emotional words)`);
        detectedPatterns.push('emotional_manipulation');
      }

      // Unreliable sourcing patterns
      const unreliableSources = [
        'some say', 'many believe', 'it is said', 'sources claim', 'allegedly',
        'reportedly', 'rumored', 'supposedly', 'apparently', 'word is',
        'people are saying', 'everyone knows', 'common knowledge', 'obvious fact',
        'unnamed sources', 'anonymous tip', 'insider information', 'leaked documents'
      ];
      
      const unreliableCount = unreliableSources.filter(phrase => lowerText.includes(phrase)).length;
      if (unreliableCount > 0) {
        const score = Math.min(unreliableCount * 3, 12);
        suspicionScore += score;
        indicators.push(`Unreliable sourcing patterns (${unreliableCount} instances)`);
        detectedPatterns.push('unreliable_sourcing');
      }

      // Medical/health misinformation patterns
      const medicalMisinfo = [
        'doctors hate this', 'cure they don\'t want', 'big pharma conspiracy',
        'natural cure', 'miracle cure', 'instant cure', 'secret remedy',
        'pharmaceutical companies', 'medical establishment', 'suppress this cure',
        'alternative medicine', 'ancient secret', 'traditional remedy'
      ];
      
      const medicalCount = medicalMisinfo.filter(phrase => lowerText.includes(phrase)).length;
      if (medicalCount > 0) {
        const score = Math.min(medicalCount * 4, 16);
        suspicionScore += score;
        indicators.push(`Medical misinformation patterns (${medicalCount} instances)`);
        detectedPatterns.push('medical_misinfo');
      }

      // Formatting and presentation issues
      const allCaps = (text.match(/[A-Z]{4,}/g) || []).length;
      const exclamationMarks = (text.match(/!/g) || []).length;
      const questionMarks = (text.match(/\?/g) || []).length;
      
      if (allCaps > 3) {
        const score = Math.min((allCaps - 3) * 1, 8);
        suspicionScore += score;
        indicators.push(`Excessive capitalization (${allCaps} instances)`);
        detectedPatterns.push('poor_formatting');
      }
      
      if (exclamationMarks > 5) {
        const score = Math.min((exclamationMarks - 5) * 0.5, 5);
        suspicionScore += score;
        indicators.push(`Excessive exclamation marks (${exclamationMarks})`);
      }

      // Credibility indicators (reduce suspicion)
      const credibilityIndicators = [
        'according to', 'research shows', 'study finds', 'data indicates',
        'peer-reviewed', 'published in', 'journal of', 'university study',
        'clinical trial', 'scientific evidence', 'expert opinion', 'professor',
        'dr.', 'phd', 'researcher', 'scientist', 'official statement',
        'government report', 'fda approved', 'verified', 'fact-checked'
      ];
      
      const credibilityCount = credibilityIndicators.filter(phrase => lowerText.includes(phrase)).length;
      if (credibilityCount > 0) {
        const reduction = Math.min(credibilityCount * 3, 15);
        suspicionScore = Math.max(0, suspicionScore - reduction);
        indicators.push(`Credibility indicators found (${credibilityCount} instances)`);
        detectedPatterns.push('credible_sources');
      }

      // Advanced risk calculation with pattern weighting
      let riskLevel = 'low';
      let confidence = 0.6;
      
      const patternWeight = detectedPatterns.length * 0.1;
      const adjustedScore = suspicionScore + (patternWeight * 10);

      if (adjustedScore >= 25) {
        riskLevel = 'critical';
        confidence = 0.95;
      } else if (adjustedScore >= 18) {
        riskLevel = 'high';
        confidence = 0.88;
      } else if (adjustedScore >= 12) {
        riskLevel = 'medium-high';
        confidence = 0.82;
      } else if (adjustedScore >= 8) {
        riskLevel = 'medium';
        confidence = 0.75;
      } else if (adjustedScore >= 4) {
        riskLevel = 'low-medium';
        confidence = 0.68;
      }

      // Additional context analysis
      const wordCount = text.split(/\s+/).length;
      const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
      const avgWordsPerSentence = wordCount / sentenceCount;
      
      if (avgWordsPerSentence < 8 && suspicionScore > 5) {
        suspicionScore += 2;
        indicators.push('Unusually short sentences with suspicious content');
      }

      const result = {
        riskLevel,
        suspicionScore: Math.round(adjustedScore),
        confidence: Math.round(confidence * 100) / 100,
        indicators,
        detectedPatterns,
        recommendation: this.getFakeNewsRecommendation(riskLevel),
        analysisDetails: {
          wordCount,
          sentenceCount,
          avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
          credibilityScore: credibilityCount
        }
      };

      console.log('📊 Advanced fake news analysis result:', result);
      return result;
    }

    getFakeNewsRecommendation(riskLevel) {
      switch (riskLevel) {
        case 'critical':
          return '🚨 CRITICAL: Extremely high risk of misinformation. Do not share. Verify with multiple authoritative sources and fact-checking organizations.';
        case 'high':
          return '⚠️ HIGH RISK: Strong indicators of misinformation. Cross-reference with reputable news sources, academic studies, and official statements before believing or sharing.';
        case 'medium-high':
          return '🔍 MEDIUM-HIGH RISK: Multiple concerning patterns detected. Verify key claims with credible sources like Reuters, AP News, or peer-reviewed research.';
        case 'medium':
          return '⚡ MODERATE RISK: Some suspicious elements present. Cross-check facts with reliable news sources and official organizations.';
        case 'low-medium':
          return '💡 LOW-MEDIUM RISK: Minor concerning patterns detected. Consider fact-checking key claims with trusted sources.';
        default:
          return '✅ LOW RISK: Content appears relatively reliable, but always verify important information with authoritative sources.';
      }
    }

    detectBias(text) {
      console.log('⚖️ Analyzing text for bias:', text.substring(0, 50) + '...');
      
      const lowerText = text.toLowerCase();
      let biasScore = 0;
      const detectedBias = [];
      const biasIndicators = [];

      // Political bias detection
      const leftLeaningTerms = [
        'progressive', 'liberal', 'socialist', 'equality', 'social justice', 'climate change',
        'systemic racism', 'wealth inequality', 'corporate greed', 'workers rights',
        'universal healthcare', 'gun control', 'reproductive rights', 'lgbtq rights',
        'environmental protection', 'minimum wage', 'tax the rich', 'medicare for all'
      ];
      
      const rightLeaningTerms = [
        'conservative', 'traditional', 'patriotic', 'free market', 'law and order',
        'family values', 'second amendment', 'pro-life', 'border security',
        'fiscal responsibility', 'limited government', 'personal responsibility',
        'religious freedom', 'constitutional rights', 'american values', 'strong defense'
      ];

      const leftCount = leftLeaningTerms.filter(term => lowerText.includes(term)).length;
      const rightCount = rightLeaningTerms.filter(term => lowerText.includes(term)).length;

      if (leftCount > rightCount + 2) {
        detectedBias.push('left-leaning');
        biasScore += (leftCount - rightCount) * 2;
        biasIndicators.push(`Left-leaning political language (${leftCount} instances)`);
      } else if (rightCount > leftCount + 2) {
        detectedBias.push('right-leaning');
        biasScore += (rightCount - leftCount) * 2;
        biasIndicators.push(`Right-leaning political language (${rightCount} instances)`);
      }

      // Emotional manipulation and loaded language
      const emotionalWords = [
        'outrageous', 'disgusting', 'shocking', 'unbelievable', 'terrifying', 'amazing',
        'horrific', 'devastating', 'appalling', 'sickening', 'infuriating', 'heartbreaking',
        'inspiring', 'heroic', 'courageous', 'brilliant', 'genius', 'perfect', 'flawless'
      ];
      
      const emotionalCount = emotionalWords.filter(word => lowerText.includes(word)).length;
      if (emotionalCount > 2) {
        detectedBias.push('emotional');
        biasScore += Math.min(emotionalCount * 1.5, 10);
        biasIndicators.push(`Emotional manipulation detected (${emotionalCount} emotional words)`);
      }

      // Loaded and prejudicial language
      const loadedLanguage = [
        'terrorist', 'extremist', 'radical', 'fanatic', 'thug', 'criminal', 'villain',
        'hero', 'saint', 'angel', 'victim', 'monster', 'beast', 'savage', 'barbarian',
        'elite', 'establishment', 'deep state', 'swamp', 'corrupt', 'crooked'
      ];
      
      const loadedCount = loadedLanguage.filter(word => lowerText.includes(word)).length;
      if (loadedCount > 1) {
        detectedBias.push('loaded-language');
        biasScore += loadedCount * 3;
        biasIndicators.push(`Loaded/prejudicial language (${loadedCount} instances)`);
      }

      // Overgeneralization and absolute statements
      const absoluteWords = [
        'all', 'every', 'always', 'never', 'everyone', 'no one', 'completely',
        'totally', 'absolutely', 'entirely', 'wholly', 'universally', 'invariably',
        'without exception', 'categorically', 'unequivocally', 'undoubtedly'
      ];
      
      const absoluteCount = absoluteWords.filter(word => lowerText.includes(word)).length;
      if (absoluteCount > 3) {
        detectedBias.push('overgeneralizing');
        biasScore += Math.min((absoluteCount - 3) * 1, 8);
        biasIndicators.push(`Overgeneralization patterns (${absoluteCount} absolute statements)`);
      }

      // Stereotyping and group generalizations
      const stereotypingPatterns = [
        'those people', 'they all', 'typical', 'as usual', 'what do you expect',
        'that\'s just how they are', 'you know how', 'classic', 'predictable',
        'same old', 'nothing new', 'par for the course'
      ];
      
      const stereotypingCount = stereotypingPatterns.filter(pattern => lowerText.includes(pattern)).length;
      if (stereotypingCount > 0) {
        detectedBias.push('stereotyping');
        biasScore += stereotypingCount * 4;
        biasIndicators.push(`Stereotyping language detected (${stereotypingCount} instances)`);
      }

      // False dichotomy and polarizing language
      const polarizingTerms = [
        'us vs them', 'good vs evil', 'right vs wrong', 'with us or against us',
        'either you\'re', 'there are only two', 'you\'re either', 'pick a side',
        'black and white', 'no middle ground', 'clear choice', 'simple choice'
      ];
      
      const polarizingCount = polarizingTerms.filter(term => lowerText.includes(term)).length;
      if (polarizingCount > 0) {
        detectedBias.push('polarizing');
        biasScore += polarizingCount * 3;
        biasIndicators.push(`Polarizing/divisive language (${polarizingCount} instances)`);
      }

      // Cherry-picking and selective evidence
      const cherryPickingTerms = [
        'some studies show', 'one expert says', 'according to one source',
        'a single study', 'isolated case', 'anecdotal evidence', 'personal experience',
        'i heard that', 'someone told me', 'word on the street'
      ];
      
      const cherryPickingCount = cherryPickingTerms.filter(term => lowerText.includes(term)).length;
      if (cherryPickingCount > 0) {
        detectedBias.push('cherry-picking');
        biasScore += cherryPickingCount * 2;
        biasIndicators.push(`Selective evidence patterns (${cherryPickingCount} instances)`);
      }

      // Ad hominem and personal attacks
      const adHominemTerms = [
        'stupid', 'idiot', 'moron', 'fool', 'ignorant', 'clueless', 'brainless',
        'pathetic', 'loser', 'failure', 'incompetent', 'worthless', 'useless'
      ];
      
      const adHominemCount = adHominemTerms.filter(term => lowerText.includes(term)).length;
      if (adHominemCount > 0) {
        detectedBias.push('ad-hominem');
        biasScore += adHominemCount * 3;
        biasIndicators.push(`Personal attacks detected (${adHominemCount} instances)`);
      }

      // Balanced language indicators (reduce bias score)
      const balancedLanguage = [
        'however', 'on the other hand', 'alternatively', 'in contrast', 'meanwhile',
        'some argue', 'others believe', 'different perspectives', 'various viewpoints',
        'it\'s worth noting', 'to be fair', 'balanced view', 'nuanced approach',
        'complex issue', 'multiple factors', 'various opinions', 'different sides'
      ];
      
      const balancedCount = balancedLanguage.filter(phrase => lowerText.includes(phrase)).length;
      if (balancedCount > 0) {
        const reduction = Math.min(balancedCount * 2, 10);
        biasScore = Math.max(0, biasScore - reduction);
        biasIndicators.push(`Balanced language found (${balancedCount} instances)`);
      }

      // Calculate severity with more nuanced levels
      let severity = 'low';
      let confidence = 0.6;

      if (biasScore >= 20) {
        severity = 'extreme';
        confidence = 0.95;
      } else if (biasScore >= 15) {
        severity = 'high';
        confidence = 0.88;
      } else if (biasScore >= 10) {
        severity = 'medium-high';
        confidence = 0.82;
      } else if (biasScore >= 6) {
        severity = 'medium';
        confidence = 0.75;
      } else if (biasScore >= 3) {
        severity = 'low-medium';
        confidence = 0.68;
      }

      const result = {
        biasTypes: detectedBias,
        biasScore: Math.round(biasScore),
        severity,
        confidence: Math.round(confidence * 100) / 100,
        indicators: biasIndicators,
        recommendation: this.getBiasRecommendation(severity),
        analysisDetails: {
          politicalLean: leftCount > rightCount + 1 ? 'left' : rightCount > leftCount + 1 ? 'right' : 'neutral',
          emotionalIntensity: emotionalCount,
          balanceScore: balancedCount
        }
      };

      console.log('⚖️ Advanced bias analysis result:', result);
      return result;
    }

    getBiasRecommendation(severity) {
      switch (severity) {
        case 'extreme':
          return '🚨 EXTREME BIAS: Heavily biased content with strong ideological slant. Seek multiple diverse sources for balanced perspective.';
        case 'high':
          return '⚠️ HIGH BIAS: Significant bias detected. Cross-reference with sources from different political perspectives.';
        case 'medium-high':
          return '🔍 MEDIUM-HIGH BIAS: Notable bias patterns present. Consider alternative viewpoints and fact-check key claims.';
        case 'medium':
          return '⚡ MODERATE BIAS: Some bias detected. Be aware of potential slant and seek additional perspectives.';
        case 'low-medium':
          return '💡 LOW-MEDIUM BIAS: Minor bias indicators present. Generally balanced but consider multiple sources.';
        default:
          return '✅ LOW BIAS: Content appears relatively balanced and neutral in presentation.';
      }
    }

    // Add missing methods that the content script expects
    updateConversationContext(userMessage, aiResponse) {
      // Simple implementation - just return basic analysis
      return {
        sentiment: this.analyzeSentiment(userMessage),
        intent: this.classifyIntent(userMessage),
        entities: { persons: [], organizations: [], locations: [] },
        topics: []
      };
    }

    analyzeSentiment(text) {
      const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'like', 'happy', 'pleased'];
      const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'angry', 'upset', 'sad'];
      
      const lowerText = text.toLowerCase();
      const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
      const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
      
      let sentiment = 'neutral';
      let confidence = 0.5;
      
      if (positiveCount > negativeCount) {
        sentiment = 'positive';
        confidence = Math.min(0.9, 0.5 + (positiveCount - negativeCount) * 0.1);
      } else if (negativeCount > positiveCount) {
        sentiment = 'negative';
        confidence = Math.min(0.9, 0.5 + (negativeCount - positiveCount) * 0.1);
      }
      
      return { sentiment, confidence };
    }

    classifyIntent(text) {
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes('?') || lowerText.includes('what') || lowerText.includes('how') || lowerText.includes('why')) {
        return { intent: 'question', confidence: 0.8 };
      } else if (lowerText.includes('please') || lowerText.includes('can you') || lowerText.includes('help')) {
        return { intent: 'request', confidence: 0.7 };
      } else {
        return { intent: 'general', confidence: 0.5 };
      }
    }

    generateContextualPrompt(userMessage, pageContext) {
      // Simple implementation - just return the original message
      return userMessage;
    }

    extractKeywords(text, maxKeywords = 10) {
      const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 3);
      const wordFreq = {};
      words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
      
      return Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, maxKeywords)
        .map(([word, frequency]) => ({ word, frequency }));
    }

    summarizeText(text, maxSentences = 3) {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
      return sentences.slice(0, maxSentences).join('. ') + '.';
    }

    extractTopics(text) {
      // Simple topic extraction based on keywords
      const topicKeywords = {
        technology: ['code', 'programming', 'software', 'tech', 'computer'],
        business: ['company', 'business', 'market', 'sales', 'revenue'],
        health: ['health', 'medical', 'doctor', 'treatment', 'medicine']
      };
      
      const lowerText = text.toLowerCase();
      const topics = [];
      
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        const count = keywords.filter(keyword => lowerText.includes(keyword)).length;
        if (count > 0) {
          topics.push({ topic, score: count });
        }
      });
      
      return topics.sort((a, b) => b.score - a.score);
    }

    // Comprehensive content analysis method
    analyzeContent(text) {
      return {
        sentiment: this.analyzeSentiment(text),
        entities: { persons: [], organizations: [], locations: [], dates: [], urls: [], emails: [], numbers: [], technologies: [] },
        topics: this.extractTopics(text),
        fakeNews: this.detectFakeNews(text),
        bias: this.detectBias(text),
        readability: this.analyzeReadability(text),
        quality: this.assessContentQuality(text),
        keywords: this.extractKeywords(text, 5),
        summary: this.summarizeText(text, 2)
      };
    }

    // Simple readability analysis
    analyzeReadability(text) {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const words = text.split(/\s+/).filter(w => w.length > 0);
      
      const avgWordsPerSentence = words.length / sentences.length || 0;
      
      let readingLevel = 'Standard';
      if (avgWordsPerSentence > 20) readingLevel = 'Difficult';
      else if (avgWordsPerSentence > 15) readingLevel = 'Fairly Difficult';
      else if (avgWordsPerSentence < 10) readingLevel = 'Easy';
      
      return {
        fleschScore: 60, // Simplified score
        readingLevel,
        avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
        totalWords: words.length,
        totalSentences: sentences.length
      };
    }

    // Simple content quality assessment
    assessContentQuality(text) {
      const fakeNewsAnalysis = this.detectFakeNews(text);
      const biasAnalysis = this.detectBias(text);
      
      let qualityScore = 100;
      qualityScore -= fakeNewsAnalysis.suspicionScore * 2;
      qualityScore -= biasAnalysis.biasScore * 1.5;
      qualityScore = Math.max(0, Math.min(100, qualityScore));
      
      let qualityLevel = '';
      if (qualityScore >= 80) qualityLevel = 'High';
      else if (qualityScore >= 60) qualityLevel = 'Good';
      else if (qualityScore >= 40) qualityLevel = 'Fair';
      else qualityLevel = 'Poor';
      
      return {
        overallScore: Math.round(qualityScore),
        qualityLevel,
        fakeNewsRisk: fakeNewsAnalysis.riskLevel,
        biasLevel: biasAnalysis.severity,
        readabilityLevel: 'Standard',
        recommendations: this.generateQualityRecommendations(fakeNewsAnalysis, biasAnalysis)
      };
    }

    generateQualityRecommendations(fakeNews, bias) {
      const recommendations = [];
      
      if (fakeNews.riskLevel === 'high' || fakeNews.riskLevel === 'medium') {
        recommendations.push('⚠️ Verify claims with credible sources');
      }
      
      if (bias.severity === 'high') {
        recommendations.push('🎯 Consider multiple perspectives on this topic');
      }
      
      if (recommendations.length === 0) {
        recommendations.push('✅ Content appears to meet quality standards');
      }
      
      return recommendations;
    }
  }



  return AdvancedNLPProcessor;
});
