export class RuleEngine {
  constructor() {
    this.rules = [];
  }

  setRules(rules) {
    this.rules = rules || [];
  }

  findMatchingRule(url) {
    if (!url || !this.rules) return null;

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const fullUrl = url.toLowerCase();

      // Find the first matching rule
      for (const rule of this.rules) {
        if (!rule.enabled) continue;

        for (const pattern of rule.patterns) {
          if (this.matchesPattern(hostname, fullUrl, pattern.toLowerCase())) {
            return rule;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error matching URL against rules:', error);
      return null;
    }
  }

  matchesPattern(hostname, fullUrl, pattern) {
    // Exact hostname match
    if (hostname === pattern) return true;
    
    // Subdomain match (e.g., "google.com" matches "docs.google.com")
    if (hostname.endsWith('.' + pattern)) return true;
    
    // Pattern contains wildcards
    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
      const regex = new RegExp('^' + regexPattern + '$');
      return regex.test(hostname);
    }
    
    // Partial match for patterns that don't specify full domain
    if (pattern.includes('.')) {
      return hostname.includes(pattern);
    } else {
      // Match against the domain name without TLD
      const domainParts = hostname.split('.');
      return domainParts.some(part => part.includes(pattern));
    }
  }

  getDomainGroup(url) {
    if (!url) return null;

    try {
      const urlObj = new URL(url);
      let hostname = urlObj.hostname.toLowerCase();
      
      // Remove www. prefix
      hostname = hostname.replace(/^www\./, '');
      
      // Extract main domain (remove subdomains for common cases)
      const parts = hostname.split('.');
      if (parts.length > 2) {
        // Keep the last two parts for most cases (domain.tld)
        // But handle special cases like co.uk, com.au, etc.
        const lastTwo = parts.slice(-2).join('.');
        const commonTlds = ['co.uk', 'com.au', 'co.jp', 'com.br', 'co.in'];
        
        if (commonTlds.includes(lastTwo) && parts.length > 2) {
          hostname = parts.slice(-3).join('.');
        } else {
          hostname = lastTwo;
        }
      }
      
      return {
        name: this.formatDomainName(hostname),
        domain: hostname,
        color: this.getDomainColor(hostname)
      };
    } catch (error) {
      console.error('Error extracting domain group:', error);
      return null;
    }
  }

  formatDomainName(domain) {
    // Convert domain to a readable group name
    return domain
      .split('.')[0]
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getDomainColor(domain) {
    // Simple hash-based color assignment for consistency
    const colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
    let hash = 0;
    
    for (let i = 0; i < domain.length; i++) {
      hash = ((hash << 5) - hash + domain.charCodeAt(i)) & 0xffffffff;
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  validateRule(rule) {
    if (!rule || typeof rule !== 'object') return false;
    if (!rule.name || typeof rule.name !== 'string') return false;
    if (!Array.isArray(rule.patterns) || rule.patterns.length === 0) return false;
    if (!rule.color || !this.isValidColor(rule.color)) return false;
    
    return true;
  }

  isValidColor(color) {
    const validColors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
    return validColors.includes(color);
  }

  testPattern(pattern, testUrl) {
    try {
      const urlObj = new URL(testUrl);
      const hostname = urlObj.hostname.toLowerCase();
      return this.matchesPattern(hostname, testUrl.toLowerCase(), pattern.toLowerCase());
    } catch (error) {
      return false;
    }
  }

  analyzeUrl(url) {
    const matchingRule = this.findMatchingRule(url);
    const domainGroup = this.getDomainGroup(url);
    
    return {
      url,
      matchingRule,
      domainGroup,
      shouldGroup: matchingRule !== null
    };
  }
}