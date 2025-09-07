export class GroupingEngine {
  constructor() {
    this.groupCache = new Map(); // Cache group info to reduce API calls
    this.processingQueue = new Set(); // Prevent duplicate processing
  }

  async processTab(tab, ruleEngine) {
    if (!tab || !tab.url || this.processingQueue.has(tab.id)) {
      return;
    }

    this.processingQueue.add(tab.id);

    try {
      // Skip chrome:// and extension pages
      if (this.shouldSkipTab(tab)) {
        return;
      }

      // Check if tab matches any rule
      const matchingRule = ruleEngine.findMatchingRule(tab.url);
      
      if (matchingRule) {
        await this.groupTabByRule(tab, matchingRule);
      } else {
        // Check if we should group by domain
        const settings = await this.getSettings();
        if (settings.groupByDomain) {
          const domainGroup = ruleEngine.getDomainGroup(tab.url);
          if (domainGroup) {
            await this.groupTabByDomain(tab, domainGroup);
          }
        }
      }
    } catch (error) {
      console.error('Error processing tab:', error);
    } finally {
      this.processingQueue.delete(tab.id);
    }
  }

  shouldSkipTab(tab) {
    return !tab.url || 
           tab.url.startsWith('chrome://') || 
           tab.url.startsWith('chrome-extension://') ||
           tab.url.startsWith('moz-extension://') ||
           tab.url === 'about:blank';
  }

  async groupTabByRule(tab, rule) {
    try {
      // Find existing group for this rule
      const existingGroup = await this.findGroupByTitle(rule.name, tab.windowId);
      
      if (existingGroup) {
        // Add to existing group if not already in it
        if (tab.groupId !== existingGroup.id) {
          await chrome.tabs.group({
            tabIds: [tab.id],
            groupId: existingGroup.id
          });
        }
      } else {
        // Create new group
        const groupId = await chrome.tabs.group({
          tabIds: [tab.id]
        });
        
        // Update group properties
        await chrome.tabGroups.update(groupId, {
          title: rule.name,
          color: rule.color,
          collapsed: await this.shouldCollapseGroup()
        });

        // Cache the new group
        this.groupCache.set(rule.name + '_' + tab.windowId, {
          id: groupId,
          title: rule.name,
          color: rule.color,
          windowId: tab.windowId
        });
      }
    } catch (error) {
      console.error('Error grouping tab by rule:', error);
    }
  }

  async groupTabByDomain(tab, domainGroup) {
    try {
      // Find existing group for this domain
      const existingGroup = await this.findGroupByTitle(domainGroup.name, tab.windowId);
      
      if (existingGroup) {
        // Add to existing group if not already in it
        if (tab.groupId !== existingGroup.id) {
          await chrome.tabs.group({
            tabIds: [tab.id],
            groupId: existingGroup.id
          });
        }
      } else {
        // Create new group
        const groupId = await chrome.tabs.group({
          tabIds: [tab.id]
        });
        
        // Update group properties
        await chrome.tabGroups.update(groupId, {
          title: domainGroup.name,
          color: domainGroup.color,
          collapsed: await this.shouldCollapseGroup()
        });

        // Cache the new group
        this.groupCache.set(domainGroup.name + '_' + tab.windowId, {
          id: groupId,
          title: domainGroup.name,
          color: domainGroup.color,
          windowId: tab.windowId
        });
      }
    } catch (error) {
      console.error('Error grouping tab by domain:', error);
    }
  }

  async findGroupByTitle(title, windowId) {
    // Check cache first
    const cacheKey = title + '_' + windowId;
    const cached = this.groupCache.get(cacheKey);
    
    if (cached) {
      try {
        // Verify the group still exists
        await chrome.tabGroups.get(cached.id);
        return cached;
      } catch (error) {
        // Group no longer exists, remove from cache
        this.groupCache.delete(cacheKey);
      }
    }

    // Query all groups in the window
    try {
      const groups = await chrome.tabGroups.query({ windowId });
      const matchingGroup = groups.find(group => group.title === title);
      
      if (matchingGroup) {
        // Update cache
        this.groupCache.set(cacheKey, matchingGroup);
        return matchingGroup;
      }
    } catch (error) {
      console.error('Error finding group by title:', error);
    }

    return null;
  }

  async shouldCollapseGroup() {
    try {
      const settings = await this.getSettings();
      return settings.autoCollapseGroups || false;
    } catch (error) {
      return false;
    }
  }

  async getSettings() {
    try {
      const result = await chrome.storage.sync.get('settings');
      return result.settings || {};
    } catch (error) {
      console.error('Error getting settings:', error);
      return {};
    }
  }

  async moveTabToGroup(tabId, groupId) {
    try {
      await chrome.tabs.group({
        tabIds: [tabId],
        groupId: groupId
      });
      return true;
    } catch (error) {
      console.error('Error moving tab to group:', error);
      return false;
    }
  }

  async createGroupFromTabs(tabIds, title, color) {
    try {
      const groupId = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(groupId, {
        title: title || 'New Group',
        color: color || 'grey'
      });
      return groupId;
    } catch (error) {
      console.error('Error creating group from tabs:', error);
      return null;
    }
  }

  async ungroupTabs(tabIds) {
    try {
      await chrome.tabs.ungroup(tabIds);
      return true;
    } catch (error) {
      console.error('Error ungrouping tabs:', error);
      return false;
    }
  }

  async getTabGroupInfo(windowId) {
    try {
      const [tabs, groups] = await Promise.all([
        chrome.tabs.query({ windowId }),
        chrome.tabGroups.query({ windowId })
      ]);

      const groupedTabs = new Map();
      const ungroupedTabs = [];

      // Organize tabs by group
      tabs.forEach(tab => {
        if (tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
          if (!groupedTabs.has(tab.groupId)) {
            groupedTabs.set(tab.groupId, []);
          }
          groupedTabs.get(tab.groupId).push(tab);
        } else {
          ungroupedTabs.push(tab);
        }
      });

      // Combine with group information
      const groupInfo = groups.map(group => ({
        ...group,
        tabs: groupedTabs.get(group.id) || []
      }));

      // Sort groups according to settings
      const sortedGroups = await this.sortGroups(groupInfo);

      return {
        groups: sortedGroups,
        ungroupedTabs,
        totalTabs: tabs.length,
        totalGroups: groups.length
      };
    } catch (error) {
      console.error('Error getting tab group info:', error);
      return {
        groups: [],
        ungroupedTabs: [],
        totalTabs: 0,
        totalGroups: 0
      };
    }
  }

  async sortGroups(groups) {
    try {
      const settings = await this.getSettings();
      const sortOrder = settings.groupSortOrder || 'created';

      if (sortOrder === 'alphabetical') {
        // Sort alphabetically by title
        return groups.sort((a, b) => {
          const titleA = (a.title || 'Untitled').toLowerCase();
          const titleB = (b.title || 'Untitled').toLowerCase();
          return titleA.localeCompare(titleB);
        });
      } else {
        // Sort by creation time (newest first) - this is the default Chrome order
        // Chrome tab groups with higher IDs are generally newer
        return groups.sort((a, b) => b.id - a.id);
      }
    } catch (error) {
      console.error('Error sorting groups:', error);
      return groups; // Return unsorted on error
    }
  }

  async reorderTabGroups(windowId) {
    try {
      // Get current groups and sort them
      const groups = await chrome.tabGroups.query({ windowId });
      if (groups.length <= 1) {
        return; // Nothing to sort
      }

      const sortedGroups = await this.sortGroups(groups);
      
      // Get all tabs for reordering
      const allTabs = await chrome.tabs.query({ windowId });
      
      // Calculate new positions for tab groups
      const reorderPromises = [];
      let currentIndex = 0;

      for (const group of sortedGroups) {
        // Get tabs in this group
        const groupTabs = allTabs.filter(tab => tab.groupId === group.id);
        
        if (groupTabs.length > 0) {
          // Move each tab in the group to its new position
          for (let i = 0; i < groupTabs.length; i++) {
            const tab = groupTabs[i];
            reorderPromises.push(
              chrome.tabs.move(tab.id, { index: currentIndex + i })
            );
          }
          currentIndex += groupTabs.length;
        }
      }

      // Execute all move operations
      if (reorderPromises.length > 0) {
        await Promise.all(reorderPromises);
      }

    } catch (error) {
      console.error('Error reordering tab groups:', error);
      throw error;
    }
  }

  clearCache() {
    this.groupCache.clear();
  }
}