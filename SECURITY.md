<div align="center">

# 🔒 WebSage Security Policy

### *Your privacy and security are our top priorities*

[![Security](https://img.shields.io/badge/security-first-green.svg)](https://github.com/Xenonesis/WebSage/security)
[![Privacy](https://img.shields.io/badge/privacy-protected-blue.svg)](https://github.com/Xenonesis/WebSage)
[![Open Source](https://img.shields.io/badge/open%20source-transparent-orange.svg)](https://github.com/Xenonesis/WebSage)

*Comprehensive security measures and privacy protection for WebSage users*

[🛡️ Security Features](#-security-features) • [🚨 Report Issues](#-reporting-a-vulnerability) • [📋 Best Practices](#-security-best-practices-for-users) • [🏗️ Architecture](#-security-architecture)

</div>

---

## 📋 Supported Versions

<table>
<tr>
<td align="center" width="50%">

### ✅ **Currently Supported**

| Version | Status | Security Updates |
|---------|--------|------------------|
| **2.0.x** | 🟢 Active | ✅ Full support |
| **2.1.x** | 🔵 Upcoming | ✅ Planned |

</td>
<td align="center" width="50%">

### ❌ **Legacy Versions**

| Version | Status | Security Updates |
|---------|--------|------------------|
| **1.0.x** | 🔴 Deprecated | ❌ No support |
| **< 1.0** | 🔴 Unsupported | ❌ No support |

</td>
</tr>
</table>

## Security Features

WebSage is designed with security and privacy as core principles:

### 🔒 Data Protection
- **Local Storage Only**: All API keys and conversation data stored locally in browser
- **No External Tracking**: Zero analytics, telemetry, or user behavior tracking
- **HTTPS Only**: All API communications use secure HTTPS connections
- **Client-Side Processing**: NLP analysis performed locally without external services
- **No Data Transmission**: User data never sent to WebSage servers (we don't have any). When you use AI chat features, your message text and page context are sent to the provider you configure (OpenAI, Gemini, Mistral, or Kilo) over HTTPS.

### 🛡️ API Key Security
- **Encrypted Storage**: API keys stored using Chrome's secure storage APIs
- **Never Exposed**: Keys never appear in the DOM or console logs
- **User Controlled**: Users manage their own API keys directly with providers
- **Secure Transmission**: Keys only sent directly to respective AI providers over HTTPS

### 🔐 Content Security
- **Input Sanitization**: All user inputs sanitized before processing
- **XSS Prevention**: Content Security Policy and safe DOM manipulation
- **Injection Protection**: Parameterized queries and safe string handling
- **Context Isolation**: Extension runs in isolated context from web pages

### 🌐 Network Security
- **Minimal Permissions**: Only requests necessary permissions for functionality
- **Host Restrictions**: Limited to HTTPS websites only
- **No Third-Party Scripts**: All code bundled with extension, no external dependencies
- **Secure Headers**: Proper security headers in all network requests

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these guidelines:

### 🚨 For Security Issues
**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please:
1. **Email**: Send details to our security team (create a private issue or contact maintainers)
2. **Include**: Detailed description of the vulnerability
3. **Provide**: Steps to reproduce the issue
4. **Specify**: Affected versions and potential impact
5. **Suggest**: Possible mitigation or fix if known

### 📋 What to Include
- **Vulnerability Type**: XSS, injection, data exposure, etc.
- **Affected Components**: Which files or features are impacted
- **Attack Vector**: How the vulnerability could be exploited
- **Impact Assessment**: Potential consequences of exploitation
- **Proof of Concept**: Safe demonstration of the issue
- **Environment**: Browser version, OS, extension version

### ⏱️ Response Timeline
- **Initial Response**: Within 48 hours of report
- **Assessment**: Security team will evaluate within 1 week
- **Fix Development**: Critical issues addressed within 2 weeks
- **Release**: Security patches released as soon as possible
- **Disclosure**: Public disclosure after fix is available

### 🏆 Recognition
We appreciate security researchers who help keep WebSage secure:
- **Acknowledgment**: Recognition in security advisories (if desired)
- **Hall of Fame**: Listed in our security contributors section
- **Coordination**: Work with you on responsible disclosure timeline

## Security Best Practices for Users

### 🔑 API Key Management
- **Use Dedicated Keys**: Create separate API keys for WebSage
- **Regular Rotation**: Rotate API keys periodically
- **Monitor Usage**: Check API usage for unexpected activity
- **Revoke if Compromised**: Immediately revoke and replace compromised keys

### 🌐 Safe Browsing
- **Trusted Sites**: Use WebSage primarily on trusted websites
- **Sensitive Data**: Avoid sharing sensitive information in chats
- **Public Computers**: Don't save API keys on shared/public computers
- **Regular Updates**: Keep the extension updated to latest version

### 🛡️ Privacy Protection
- **Review Permissions**: Understand what permissions the extension requests
- **Clear Data**: Regularly clear conversation history if desired
- **Monitor Activity**: Be aware of what data you're sharing with AI providers
- **Read Policies**: Review AI provider privacy policies and terms

## Security Architecture

### Extension Security Model
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Page      │    │   WebSage        │    │   AI Provider   │
│   (Isolated)    │◄──►│   Extension      │◄──►│   (HTTPS Only)  │
│                 │    │   (Sandboxed)    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Local Storage  │
                       │   (Encrypted)    │
                       └──────────────────┘
```

### Data Flow Security
1. **User Input** → Sanitized and validated
2. **Page Content** → Extracted safely with content scripts
3. **API Requests** → Sent directly to AI providers over HTTPS
4. **Responses** → Sanitized before display
5. **Storage** → Encrypted local storage only

## Compliance and Standards

### Security Standards
- **OWASP Guidelines**: Following web application security best practices
- **Chrome Extension Security**: Adhering to Chrome's security requirements
- **Manifest V3**: Using latest security-focused extension platform
- **CSP**: Content Security Policy implementation

### Privacy Compliance
- **No Data Collection**: We don't collect any user data
- **GDPR Friendly**: No personal data processing by WebSage
- **User Control**: Users have full control over their data
- **Transparency**: Open source code for full transparency

## Security Updates

### Update Process
- **Automatic Updates**: Chrome automatically updates the extension
- **Security Patches**: Critical security fixes released immediately
- **Version Notifications**: Users notified of important security updates
- **Changelog**: All security fixes documented in changelog

### Staying Informed
- **GitHub Releases**: Watch repository for security announcements
- **Security Advisories**: Subscribe to GitHub security advisories
- **Community**: Join community discussions for security updates

## Contact

For security-related questions or concerns:
- **Security Issues**: Use private reporting methods
- **General Questions**: Create public GitHub issues
- **Community**: Join discussions in GitHub Discussions

---

**Remember**: Security is a shared responsibility. Help us keep WebSage secure by following best practices and reporting any concerns promptly.

Last Updated: 2025