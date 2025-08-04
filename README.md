# Running Summarizer Plugin

An Obsidian plugin that automatically summarizes your past work notes using LLM to help bootstrap your daily work memory.

## Features

- **Concise Action Lists**: Focuses only on incomplete work, ignoring finished tasks
- **Smart Checkboxes**: Mark items complete with checkboxes - they'll be ignored in future summaries
- **Weekend Gap Handling**: Automatically skips missing days (weekends) to find actual work notes
- **Configurable Lookback**: Choose how many days to look back (1-8 days)
- **LLM Integration**: Uses OpenAI or compatible APIs to generate contextual summaries
- **Flexible Note Patterns**: Works with various daily note naming conventions
- **Callout Integration**: Inserts summaries as attractive callouts at your cursor position
- **Live Placeholder**: Shows a loading indicator while the AI generates your summary
- **Recent Focus**: Identifies what you were last working on from your most recent notes
- **Quick Suggestions**: Brief, actionable recommendations for tools and techniques

## How it Works

1. **Command Execution**: Run the "Generate work summary from past notes" command
2. **Note Discovery**: The plugin looks for daily notes matching your configured date pattern
3. **Placeholder Display**: Shows a loading indicator with progress information
4. **Content Analysis**: Reads and analyzes the content of past notes
5. **LLM Summarization**: Sends note content to your configured LLM for intelligent summarization
6. **Summary Insertion**: Replaces the placeholder with the formatted summary callout

## Setup

1. Install the plugin
2. Configure your settings:
   - **API Key**: Your OpenAI API key (or compatible service)
   - **Days to Look Back**: How many past days to include (default: 5)
   - **Note Pattern**: Date format for your daily notes (e.g., `YYYY-MM-DD`)
   - **API URL**: LLM API endpoint (default: OpenAI)
   - **Model**: Which model to use (default: `gpt-4.1-mini`)

## Usage

1. Open your current daily note
2. Position your cursor where you want the summary
3. Open Command Palette (`Ctrl/Cmd + P`)
4. Run "Generate work summary from past notes"
5. Wait for the LLM to generate your summary
6. The summary will be inserted as a callout at your cursor position

## Example Output

```markdown
> [!info] Work Summary (2024-01-15)
> Generated from past 2 days of notes
> 
> **📋 OPEN ITEMS:**
> - [ ] Finalize GraphQL schema design for user authentication
> - [ ] Complete security review for payment module
> - [ ] Investigate root cause of payment processing timeout
> - [ ] Schedule Q2 roadmap planning meeting
> - [ ] Set up performance testing environment
> 
> **🎯 LAST WORKING ON:** Payment processing timeout debugging on Friday
> 
> **💡 QUICK SUGGESTION:** Try distributed tracing (Jaeger) for payment debugging
```

### Weekend Gap Handling

The plugin automatically handles missing days! If you set it to look back 2 days but it's Monday:
- It will skip Saturday & Sunday (no notes)
- Find Friday & Thursday notes instead
- Always gets the requested number of actual work days

### Using Checkboxes

Once you complete an item, simply check the box:
```markdown
> **📋 OPEN ITEMS:**
> - [x] Finalize GraphQL schema design for user authentication ✅ Done!
> - [ ] Complete security review for payment module
> - [ ] Investigate root cause of payment processing timeout
```

The plugin will automatically ignore checked items in future summaries, keeping your action list focused on what still needs attention.

## Configuration

### Note Pattern Examples
- `YYYY-MM-DD` - matches notes like "2024-01-15"
- `YYYY-MM-DD-dddd` - matches notes like "2024-01-15-Monday"
- Custom patterns using moment.js format

### Supported APIs
- OpenAI (default)
- Any OpenAI-compatible API (Anthropic Claude via proxy, local LLMs, etc.)

## Development

- Clone this repo.
- Make sure your NodeJS is at least v16 (`node --version`).
- `npm i` or `yarn` to install dependencies.
- `npm run dev` to start compilation in watch mode.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

## Improve code quality with eslint (optional)
- [ESLint](https://eslint.org/) is a tool that analyzes your code to quickly find problems. You can run ESLint against your plugin to find common bugs and ways to improve your code. 
- To use eslint with this project, make sure to install eslint from terminal:
  - `npm install -g eslint`
- To use eslint to analyze this project use this command:
  - `eslint main.ts`
  - eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder:
  - `eslint .\src\`

## Funding URL

You can include funding URLs where people who use your plugin can financially support it.

The simple way is to set the `fundingUrl` field to your link in your `manifest.json` file:

```json
{
    "fundingUrl": "https://buymeacoffee.com"
}
```

If you have multiple URLs, you can also do:

```json
{
    "fundingUrl": {
        "Buy Me a Coffee": "https://buymeacoffee.com",
        "GitHub Sponsor": "https://github.com/sponsors",
        "Patreon": "https://www.patreon.com/"
    }
}
```

## API Documentation

See https://github.com/obsidianmd/obsidian-api
