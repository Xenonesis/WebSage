// WebSage NLP engine unit tests (node:test, zero dependencies).
// Run: node --test nlp.test.js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const AdvancedNLPProcessor = require('./nlp.js');

test('nlp.js exports the processor via the UMD wrapper', () => {
  assert.equal(typeof AdvancedNLPProcessor, 'function');
});

test('constructor initializes the fake-news cache', () => {
  const p = new AdvancedNLPProcessor();
  assert.ok(p.fakeNewsCache instanceof Map);
});

test('detectFakeNews flags clickbait text as high risk', () => {
  const p = new AdvancedNLPProcessor();
  const result = p.detectFakeNews(
    "SHOCKING! You won't believe what happens next! Doctors hate this one weird trick!"
  );
  assert.equal(result.riskLevel, 'high');
  assert.equal(result.suspicionScore, 21);
  assert.deepEqual(result.detectedPatterns, [
    'sensational_language',
    'clickbait',
    'medical_misinfo'
  ]);
});

test('detectFakeNews clears attributed research text as low risk', () => {
  const p = new AdvancedNLPProcessor();
  const result = p.detectFakeNews(
    'According to Dr. Smith, a professor at Harvard University, the clinical trial ' +
    'published in the Journal of Medicine showed the treatment is safe and effective.'
  );
  assert.equal(result.riskLevel, 'low');
  assert.ok(result.detectedPatterns.includes('credible_sources'));
});

test('getFakeNewsRecommendation covers every risk level', () => {
  const p = new AdvancedNLPProcessor();
  for (const level of ['critical', 'high', 'medium-high', 'medium', 'low-medium', 'low']) {
    assert.ok(p.getFakeNewsRecommendation(level).length > 10, `recommendation for ${level}`);
  }
});

test('detectBias rates loaded language as medium severity', () => {
  const p = new AdvancedNLPProcessor();
  const result = p.detectBias(
    'This extreme left-wing propaganda is pure nonsense from the corrupt mainstream media. ' +
    'Everyone knows the radical agenda is destroying our country and our traditional values ' +
    'are under attack by these insane lunatics.'
  );
  assert.equal(result.severity, 'medium');
  assert.equal(typeof result.biasScore, 'number');
  assert.ok(Array.isArray(result.biasTypes));
});

test('analyzeSentiment classifies positive text', () => {
  const p = new AdvancedNLPProcessor();
  assert.deepEqual(
    p.analyzeSentiment('This product is great and amazing, I love it!'),
    { sentiment: 'positive', confidence: 0.8 }
  );
});

test('analyzeSentiment classifies negative text', () => {
  const p = new AdvancedNLPProcessor();
  assert.deepEqual(
    p.analyzeSentiment('This is bad, terrible and awful, I hate it.'),
    { sentiment: 'negative', confidence: 0.9 }
  );
});

test('analyzeSentiment defaults to neutral', () => {
  const p = new AdvancedNLPProcessor();
  assert.deepEqual(
    p.analyzeSentiment('The table is brown.'),
    { sentiment: 'neutral', confidence: 0.5 }
  );
});

test('classifyIntent: question markers take precedence over request markers', () => {
  const p = new AdvancedNLPProcessor();
  assert.equal(p.classifyIntent('What is the weather today?').intent, 'question');
  // A '?' makes this a question even though it also contains request words.
  assert.equal(p.classifyIntent('Can you please help me summarize this page?').intent, 'question');
});

test('classifyIntent: request and general intents', () => {
  const p = new AdvancedNLPProcessor();
  assert.equal(p.classifyIntent('Please help me summarize this page').intent, 'request');
  assert.equal(p.classifyIntent('JavaScript is a programming language.').intent, 'general');
});

test('extractKeywords ranks words by frequency', () => {
  const p = new AdvancedNLPProcessor();
  assert.deepEqual(p.extractKeywords('cats cats cats dogs birds'), [
    { word: 'cats', frequency: 3 },
    { word: 'dogs', frequency: 1 },
    { word: 'birds', frequency: 1 }
  ]);
});

test('summarizeText keeps the first long sentences', () => {
  const p = new AdvancedNLPProcessor();
  assert.equal(
    p.summarizeText(
      'This is the first sentence of the paragraph. ' +
      'This is the second sentence here as well. ' +
      'This is the third one.'
    ),
    'This is the first sentence of the paragraph.  ' +
    'This is the second sentence here as well.  ' +
    'This is the third one.'
  );
});

test('extractTopics detects business language', () => {
  const p = new AdvancedNLPProcessor();
  assert.deepEqual(
    p.extractTopics("The company's revenue and market sales grew."),
    [{ topic: 'business', score: 4 }]
  );
});

test('analyzeReadability reports reading level and averages', () => {
  const p = new AdvancedNLPProcessor();
  const r = p.analyzeReadability(
    'The quick brown fox jumps over the lazy dog near the river bank. ' +
    'Another simple sentence follows here.'
  );
  assert.equal(r.readingLevel, 'Easy');
  assert.equal(r.avgWordsPerSentence, 9);
  assert.equal(r.totalWords, 18);
  assert.equal(r.totalSentences, 2);
});

test('analyzeContent returns the full analysis shape', () => {
  const p = new AdvancedNLPProcessor();
  const a = p.analyzeContent('This is a simple statement about nothing in particular.');
  for (const key of [
    'sentiment', 'entities', 'topics', 'fakeNews', 'bias',
    'readability', 'quality', 'keywords', 'summary'
  ]) {
    assert.ok(key in a, `analyzeContent result has ${key}`);
  }
});

test('assessContentQuality returns a bounded score and risk mapping', () => {
  const p = new AdvancedNLPProcessor();
  const q = p.assessContentQuality(
    "SHOCKING! You won't believe what happens next! Doctors hate this one weird trick!"
  );
  assert.equal(typeof q.overallScore, 'number');
  assert.ok(q.overallScore >= 0 && q.overallScore <= 100, `score ${q.overallScore} in range`);
  assert.equal(typeof q.qualityLevel, 'string');
  assert.equal(q.fakeNewsRisk, 'high');
  assert.ok(Array.isArray(q.recommendations));
  assert.ok(q.recommendations.some((r) => r.includes('Verify claims')));
});
