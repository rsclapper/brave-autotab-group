export class HistoryAnalyzer {
  constructor() {
    this.siteCategories = {
      'news': ['news', 'cnn', 'bbc', 'reuters', 'techcrunch', 'ycombinator', 'hackernews', 'medium', 'substack'],
      'social': ['facebook', 'twitter', 'instagram', 'linkedin', 'reddit', 'tiktok', 'snapchat', 'discord', 'telegram'],
      'shopping': ['amazon', 'ebay', 'etsy', 'shopify', 'walmart', 'target', 'alibaba', 'shop'],
      'development': ['github', 'gitlab', 'stackoverflow', 'npm', 'developer.mozilla', 'codepen', 'codesandbox', 'repl.it'],
      'google': ['gmail', 'docs.google', 'drive.google', 'calendar.google', 'meet.google', 'maps.google', 'youtube'],
      'microsoft': ['outlook', 'office', 'microsoft', 'teams.microsoft', 'onedrive', 'xbox'],
      'entertainment': ['youtube', 'netflix', 'hulu', 'disney', 'twitch', 'spotify', 'soundcloud', 'podcasts'],
      'productivity': ['notion', 'slack', 'asana', 'trello', 'monday', 'airtable', 'figma', 'canva'],
      'education': ['coursera', 'udemy', 'khan', 'edx', 'pluralsight', 'codecademy', 'freecodecamp'],
      'finance': ['paypal', 'stripe', 'coinbase', 'robinhood', 'mint', 'chase', 'bank', 'credit']
    };
  }

  async analyzeHistory(days = 7) {
    try {
      const endTime = Date.now();
      const startTime = endTime - (days * 24 * 60 * 60 * 1000); // 7 days ago

      // Get history items from the last 7 days
      const historyItems = await chrome.history.search({
        text: '',
        startTime: startTime,
        endTime: endTime,
        maxResults: 1000
      });

      return this.processHistoryItems(historyItems);
    } catch (error) {
      console.error('Error analyzing history:', error);
      return {
        domainFrequency: {},
        suggestions: [],
        totalVisits: 0
      };
    }
  }

  processHistoryItems(historyItems) {
    const domainFrequency = {};
    let totalVisits = 0;

    // Count visits per domain
    historyItems.forEach(item => {
      try {
        const url = new URL(item.url);
        const domain = url.hostname.replace(/^www\./, '').toLowerCase();
        
        // Skip common system and extension URLs
        if (this.shouldSkipDomain(domain)) {
          return;
        }

        const visitCount = item.visitCount || 1;
        domainFrequency[domain] = (domainFrequency[domain] || 0) + visitCount;
        totalVisits += visitCount;
      } catch (error) {
        // Skip invalid URLs
      }
    });

    const suggestions = this.generateSuggestions(domainFrequency);

    return {
      domainFrequency,
      suggestions,
      totalVisits
    };
  }

  shouldSkipDomain(domain) {
    // Skip chrome internal pages, extensions, localhost, etc.
    return domain.startsWith('chrome') || 
           domain.startsWith('moz-') || 
           domain === 'localhost' ||
           domain.startsWith('127.0.0.1') ||
           domain.includes('chrome-extension') ||
           domain === '' ||
           domain === 'newtab' ||
           domain === 'about:blank';
  }

  generateSuggestions(domainFrequency) {
    const suggestions = [];
    const minVisits = 3; // Minimum visits to suggest a rule
    
    // Group domains by category
    const categorizedDomains = {};
    const uncategorizedDomains = [];

    Object.entries(domainFrequency).forEach(([domain, count]) => {
      if (count < minVisits) return;

      const category = this.categorizeDomain(domain);
      if (category) {
        if (!categorizedDomains[category]) {
          categorizedDomains[category] = [];
        }
        categorizedDomains[category].push({ domain, count });
      } else {
        uncategorizedDomains.push({ domain, count });
      }
    });

    // Create suggestions for categorized domains
    Object.entries(categorizedDomains).forEach(([category, domains]) => {
      if (domains.length >= 2) { // At least 2 domains in category
        const totalVisits = domains.reduce((sum, d) => sum + d.count, 0);
        const domainList = domains.map(d => d.domain);
        
        suggestions.push({
          id: `suggested_${category}_${Date.now()}`,
          name: this.getCategoryDisplayName(category),
          patterns: domainList,
          color: this.getCategoryColor(category),
          category: category,
          domains: domains,
          totalVisits: totalVisits,
          confidence: this.calculateConfidence(domains, totalVisits)
        });
      }
    });

    // Create suggestions for high-traffic uncategorized domains
    uncategorizedDomains
      .filter(d => d.count >= minVisits * 2) // Higher threshold for uncategorized
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) // Top 5 uncategorized domains
      .forEach(({ domain, count }) => {
        suggestions.push({
          id: `suggested_domain_${domain}_${Date.now()}`,
          name: this.generateDomainGroupName(domain),
          patterns: [domain],
          color: 'grey',
          category: 'domain',
          domains: [{ domain, count }],
          totalVisits: count,
          confidence: this.calculateConfidence([{ domain, count }], count)
        });
      });

    // Sort suggestions by confidence and total visits
    return suggestions.sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      return b.totalVisits - a.totalVisits;
    }).slice(0, 8); // Limit to top 8 suggestions
  }

  categorizeDomain(domain) {
    for (const [category, keywords] of Object.entries(this.siteCategories)) {
      if (keywords.some(keyword => domain.includes(keyword))) {
        return category;
      }
    }
    return null;
  }

  getCategoryDisplayName(category) {
    const displayNames = {
      'news': 'News & Media',
      'social': 'Social Media',
      'shopping': 'Shopping',
      'development': 'Development Tools',
      'google': 'Google Services',
      'microsoft': 'Microsoft Services',
      'entertainment': 'Entertainment',
      'productivity': 'Productivity Tools',
      'education': 'Learning & Education',
      'finance': 'Finance & Banking'
    };
    return displayNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
  }

  getCategoryColor(category) {
    const categoryColors = {
      'news': 'red',
      'social': 'blue',
      'shopping': 'orange',
      'development': 'purple',
      'google': 'green',
      'microsoft': 'blue',
      'entertainment': 'pink',
      'productivity': 'cyan',
      'education': 'yellow',
      'finance': 'green'
    };
    return categoryColors[category] || 'grey';
  }

  generateDomainGroupName(domain) {
    // Convert domain to a nice display name
    const parts = domain.split('.');
    const mainPart = parts[0];
    
    // Capitalize and make it readable
    return mainPart.charAt(0).toUpperCase() + mainPart.slice(1) + ' Sites';
  }

  calculateConfidence(domains, totalVisits) {
    // Higher confidence for:
    // - More domains in the group
    // - More total visits
    // - More consistent visit patterns
    
    const domainCount = domains.length;
    const avgVisitsPerDomain = totalVisits / domainCount;
    
    // Base confidence on domain count and visit frequency
    let confidence = Math.min(domainCount * 20, 80); // Max 80 from domain count
    
    // Boost for high visit frequency
    if (avgVisitsPerDomain >= 10) confidence += 15;
    else if (avgVisitsPerDomain >= 5) confidence += 10;
    else if (avgVisitsPerDomain >= 3) confidence += 5;
    
    // Normalize to 0-100
    return Math.min(Math.round(confidence), 100);
  }

  async filterExistingSuggestions(suggestions, existingRules) {
    // Filter out suggestions that overlap significantly with existing rules
    return suggestions.filter(suggestion => {
      return !this.hasSignificantOverlap(suggestion, existingRules);
    });
  }

  hasSignificantOverlap(suggestion, existingRules) {
    const suggestionDomains = new Set(suggestion.patterns);
    
    for (const rule of existingRules) {
      if (!rule.enabled) continue;
      
      const ruleDomains = new Set(rule.patterns.map(p => p.toLowerCase()));
      const intersection = new Set([...suggestionDomains].filter(d => ruleDomains.has(d)));
      
      // If more than 50% of suggestion domains are already covered
      if (intersection.size / suggestionDomains.size > 0.5) {
        return true;
      }
    }
    
    return false;
  }
}