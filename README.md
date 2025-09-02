# Brave Auto-Tab Group Extension

Automatically group your tabs in Brave browser based on domains or custom rules for better organization and productivity.

## Features

- **🔄 Automatic Grouping**: Tabs are automatically grouped as you browse
- **🎯 Custom Rules**: Create custom grouping rules based on URL patterns
- **🌐 Domain Grouping**: Fallback domain-based grouping when no rules match
- **🎨 Color Coding**: Assign colors to different groups for visual organization
- **⚡ Real-time Processing**: Instant grouping of new tabs and URL changes
- **🛠️ Manual Controls**: Popup interface for manual group management
- **📱 Responsive Design**: Clean, modern interface that works on all screen sizes
- **💾 Backup & Restore**: Export/import your settings and rules

## Installation

### For Development/Testing

1. **Clone or Download** this repository to your local machine
2. **Open Brave Browser** and navigate to `brave://extensions/`
3. **Enable Developer Mode** by toggling the switch in the top-right corner
4. **Click "Load unpacked"** and select the `brave-autotab-group` folder
5. **The extension is now installed!** You should see the Auto-Tab Group icon in your toolbar

### Creating Icons (Optional)

The extension expects icon files in the `icons/` directory:
- `icon16.png` (16x16px)
- `icon32.png` (32x32px) 
- `icon48.png` (48x48px)
- `icon128.png` (128x128px)

You can create simple icons or use placeholder images for testing.

## Usage

### First Run

1. **Click the extension icon** in the toolbar to open the popup
2. **Enable auto-grouping** if it's not already enabled
3. **Click "Group All Tabs"** to group your existing tabs
4. **Visit the Options page** to customize rules and settings

### Default Rules

The extension comes with pre-configured rules for common website categories:

- **Social Media**: Facebook, Twitter/X, Instagram, LinkedIn, Reddit, TikTok
- **Google Services**: Gmail, Google Docs, Drive, Calendar, Meet
- **Development**: GitHub, GitLab, Stack Overflow, NPM, MDN
- **News & Media**: News sites, BBC, CNN, Reuters, TechCrunch, Hacker News
- **Shopping**: Amazon, eBay, Etsy, Shopify, Walmart

### Creating Custom Rules

1. **Open Options** by clicking the extension icon → Options
2. **Click "Add Rule"** to create a new grouping rule
3. **Configure the rule**:
   - **Name**: Display name for the tab group
   - **Color**: Visual color for the tab group
   - **URL Patterns**: Domain patterns to match (one per line)
   - **Enabled**: Toggle to enable/disable the rule

#### Pattern Examples

- `google.com` - Matches google.com and all subdomains
- `*.github.com` - Matches all GitHub subdomains
- `news.` - Matches any domain starting with "news."
- `reddit.com` - Matches reddit.com exactly

### Manual Controls

Use the popup interface to:
- **Toggle** auto-grouping on/off
- **View current groups** and tab counts
- **Group all tabs** manually
- **Ungroup all tabs** to start fresh
- **Manage individual groups** (collapse, ungroup)

## Configuration Options

### General Settings

- **Enable auto-grouping**: Master toggle for the extension
- **Group by domain**: Group tabs by domain when no rules match
- **Auto-collapse groups**: Automatically collapse new groups to save space
- **Max tabs per group**: Limit the number of tabs in a single group

### Rule Management

- **Add/Edit/Delete** custom grouping rules
- **Enable/Disable** individual rules
- **Test patterns** against URLs before saving
- **Reorder rules** (rules are applied in order)

### Backup & Restore

- **Export Settings**: Download your configuration as a JSON file
- **Import Settings**: Restore configuration from a previously exported file

## Technical Details

### Architecture

- **Manifest V3**: Future-proof extension format
- **Service Worker**: Background script for continuous tab monitoring
- **Chrome APIs**: Uses `chrome.tabs` and `chrome.tabGroups` APIs
- **Storage API**: Persistent settings storage across browser sessions

### Permissions

- `tabs`: Access to tab information and management
- `tabGroups`: Tab group creation and management
- `storage`: Settings persistence
- `<all_urls>`: Access to tab URLs for domain matching

### Compatibility

- **Brave Browser**: Full compatibility (primary target)
- **Chrome**: Full compatibility (uses Chrome extension APIs)
- **Edge**: Should work (Chromium-based)
- **Other Chromium browsers**: Likely compatible

## Troubleshooting

### Extension Not Working

1. **Check permissions**: Ensure all required permissions are granted
2. **Reload extension**: Go to `brave://extensions/` and click the reload button
3. **Check console**: Look for error messages in the extension's service worker console

### Tabs Not Grouping

1. **Check if enabled**: Ensure auto-grouping is enabled in the popup
2. **Review rules**: Check if your URLs match any configured patterns
3. **Domain grouping**: Enable domain-based grouping as a fallback
4. **Test patterns**: Use the pattern tester in the Options page

### Groups Not Staying

1. **Conflicting extensions**: Other tab management extensions may interfere
2. **Browser settings**: Some browser settings can affect tab grouping
3. **Rule order**: Rules are applied in order, check for conflicts

## Development

### File Structure

```
brave-autotab-group/
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── popup/                 # Extension popup
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/               # Settings page
│   ├── options.html
│   ├── options.js
│   └── options.css
├── utils/                 # Core utilities
│   ├── storage.js         # Settings management
│   ├── grouping.js        # Tab grouping logic
│   └── rules.js           # Rule matching engine
└── icons/                 # Extension icons
```

### Key Classes

- **TabGroupManager**: Main background script coordinator
- **StorageManager**: Handles settings persistence
- **GroupingEngine**: Core tab grouping logic
- **RuleEngine**: URL pattern matching
- **PopupManager**: Popup interface controller
- **OptionsManager**: Options page controller

## License

This project is open source. Feel free to modify and distribute according to your needs.

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## Support

If you encounter any issues or have questions, please check the troubleshooting section above or create an issue in the project repository.