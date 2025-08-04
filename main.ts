import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, TFile, moment } from 'obsidian';

interface RunningSummarizerSettings {
	daysToLookBack: number;
	apiKey: string;
	apiUrl: string;
	modelName: string;
	notePattern: string;
	summaryCalloutType: string;
}

const DEFAULT_SETTINGS: RunningSummarizerSettings = {
	daysToLookBack: 2,
	apiKey: '',
	apiUrl: 'https://api.openai.com/v1/chat/completions',
	modelName: 'gpt-4.1-mini',
	notePattern: 'YYYY-MM-DD',
	summaryCalloutType: 'info'
}

export default class RunningSummarizerPlugin extends Plugin {
	settings: RunningSummarizerSettings;

	async onload() {
		await this.loadSettings();

		// Add command to generate summary
		this.addCommand({
			id: 'generate-work-summary',
			name: 'Generate work summary from past notes',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.generateSummary(editor, view);
			}
		});

		// Add settings tab
		this.addSettingTab(new RunningSummarizerSettingTab(this.app, this));
	}

	async generateSummary(editor: Editor, view: MarkdownView) {
		if (!this.settings.apiKey) {
			new Notice('Please configure your API key in the plugin settings first.');
			return;
		}

		// Store cursor position for placeholder insertion
		const cursor = editor.getCursor();
		const placeholderStart = cursor;
		let placeholderEnd = cursor;

		try {
			new Notice('Generating summary...');

			const pastNotes = await this.getPastNotes();
			if (pastNotes.length === 0) {
				new Notice('No past notes found to summarize.');
				return;
			}

			// Insert placeholder while processing
			const placeholder = this.createPlaceholder(pastNotes.length);
			editor.replaceRange(placeholder, cursor);

			// Update placeholder end position after insertion
			const lines = placeholder.split('\n').length - 1;
			const lastLineLength = placeholder.split('\n')[lines].length;
			placeholderEnd = {
				line: cursor.line + lines,
				ch: lines > 0 ? lastLineLength : cursor.ch + lastLineLength
			};

			// Generate the actual summary
			const summary = await this.generateSummaryFromNotes(pastNotes);
			const summaryCallout = this.formatSummaryAsCallout(summary);

			// Replace placeholder with actual summary
			editor.replaceRange(summaryCallout, placeholderStart, placeholderEnd);

			new Notice('Summary generated successfully!');
		} catch (error) {
			console.error('Error generating summary:', error);

			// If there was an error and we have a placeholder, replace it with error message
			if (placeholderEnd.line > placeholderStart.line || placeholderEnd.ch > placeholderStart.ch) {
				const errorCallout = this.formatErrorAsCallout();
				editor.replaceRange(errorCallout, placeholderStart, placeholderEnd);
			}

			new Notice('Failed to generate summary. Check console for details.');
		}
	}

	async getPastNotes(): Promise<Array<{ file: TFile, content: string, date: string }>> {
		const files = this.app.vault.getMarkdownFiles();
		const today = moment();
		const pastNotes: Array<{ file: TFile, content: string, date: string }> = [];
		const maxSearchDays = this.settings.daysToLookBack * 3; // Search up to 3x the desired days to handle weekends
		
		let foundNotes = 0;
		for (let i = 1; i <= maxSearchDays && foundNotes < this.settings.daysToLookBack; i++) {
			const date = today.clone().subtract(i, 'days');
			const expectedName = date.format(this.settings.notePattern);

			// Look for files that match the date pattern
			const matchingFiles = files.filter(file =>
				file.basename.includes(expectedName) ||
				file.basename === expectedName
			);

			if (matchingFiles.length > 0) {
				for (const file of matchingFiles) {
					const content = await this.app.vault.read(file);

					// Filter out completed checkbox items from the content
					const filteredContent = this.filterCompletedItems(content);

					// Check if this note already contains a summary - if so, should we stop looking back further?
					if (this.containsSummary(content)) {
						// For now, let's include it but mark it specially
						pastNotes.push({
							file,
							content: filteredContent,
							date: expectedName
						});
						// Could add logic here to decide whether to stop looking back further
					} else {
						pastNotes.push({
							file,
							content: filteredContent,
							date: expectedName
						});
					}
				}
				foundNotes++;
			}
		}

		return pastNotes.sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
	}

	containsSummary(content: string): boolean {
		// Check if the content contains a summary callout
		const summaryRegex = new RegExp(`> \\[!${this.settings.summaryCalloutType}\\].*Summary`, 'i');
		return summaryRegex.test(content);
	}

	// Helper method to filter out content with completed checkboxes
	filterCompletedItems(content: string): string {
		// Remove lines that contain completed checkboxes (- [x] or - [X])
		const lines = content.split('\n');
		const filteredLines = lines.filter(line => {
			// Keep the line if it doesn't contain a completed checkbox
			return !line.match(/^\s*>\s*-\s*\[x\]/i) && !line.match(/^\s*-\s*\[x\]/i);
		});
		return filteredLines.join('\n');
	}

	async generateSummaryFromNotes(notes: Array<{ file: TFile, content: string, date: string }>): Promise<string> {
		const prompt = this.buildPrompt(notes);

		const response = await fetch(this.settings.apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.settings.apiKey}`
			},
			body: JSON.stringify({
				model: this.settings.modelName,
				messages: [
					{
						role: 'system',
						content: 'You are a concise productivity assistant. Create brief, actionable summaries focusing only on incomplete work. Ignore completed items (marked with [x]). Use checkboxes for all open items. Be specific but concise - aim for clarity over detail. Focus on what needs to be done, not what was accomplished.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				max_tokens: 800,
				temperature: 0.3
			})
		});

		if (!response.ok) {
			throw new Error(`API request failed: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		return data.choices[0].message.content.trim();
	}

	buildPrompt(notes: Array<{ file: TFile, content: string, date: string }>): string {
		let prompt = `Create a concise work summary from the past ${this.settings.daysToLookBack} days. Focus ONLY on what's still incomplete or needs attention. Ignore any items with checked boxes (- [x]) as those are done.\n\n`;

		prompt += `Format:\n`;
		prompt += `**📋 OPEN ITEMS:**\n`;
		prompt += `- [ ] Brief description of incomplete task/blocker\n`;
		prompt += `- [ ] Another open item\n\n`;

		prompt += `**🎯 LAST WORKING ON:** What was the main focus on the most recent day\n\n`;

		prompt += `**� QUICK SUGGESTION:** One specific tool/technique recommendation\n\n`;

		prompt += `Here are the notes:\n\n`;

		for (const note of notes) {
			prompt += `=== ${note.date} ===\n`;
			prompt += `${note.content}\n\n`;
		}

		prompt += `Keep it concise! Only list truly incomplete work. Use checkboxes for all open items so they can be marked complete later.`;

		return prompt;
	}

	formatSummaryAsCallout(summary: string): string {
		const date = moment().format('YYYY-MM-DD');
		return `\n> [!${this.settings.summaryCalloutType}] Work Summary (${date})\n` +
			`> Generated from past ${this.settings.daysToLookBack} days of notes\n>\n` +
			summary.split('\n').map(line => `> ${line}`).join('\n') + '\n\n';
	}

	createPlaceholder(noteCount: number): string {
		const date = moment().format('YYYY-MM-DD');
		return `\n> [!${this.settings.summaryCalloutType}] ⏳ Generating Work Summary (${date})\n` +
			`> Analyzing ${noteCount} notes from past ${this.settings.daysToLookBack} days...\n` +
			`> Please wait while the AI generates your summary.\n\n`;
	}

	formatErrorAsCallout(): string {
		const date = moment().format('YYYY-MM-DD');
		return `\n> [!warning] ❌ Summary Generation Failed (${date})\n` +
			`> An error occurred while generating the summary.\n` +
			`> Please check the console for details and verify your API settings.\n\n`;
	}

	onunload() {
		// Cleanup if needed
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class RunningSummarizerSettingTab extends PluginSettingTab {
	plugin: RunningSummarizerPlugin;

	constructor(app: App, plugin: RunningSummarizerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Running Summarizer Settings' });

		new Setting(containerEl)
			.setName('Days to look back')
			.setDesc('How many days of past notes to include in the summary')
			.addSlider(slider => slider
				.setLimits(1, 8, 1)
				.setValue(this.plugin.settings.daysToLookBack)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.daysToLookBack = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Note pattern')
			.setDesc('Date format pattern for your daily notes (e.g., YYYY-MM-DD, YYYY-MM-DD-dddd)')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD')
				.setValue(this.plugin.settings.notePattern)
				.onChange(async (value) => {
					this.plugin.settings.notePattern = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Summary callout type')
			.setDesc('Type of callout to use for summaries (info, note, tip, etc.)')
			.addText(text => text
				.setPlaceholder('info')
				.setValue(this.plugin.settings.summaryCalloutType)
				.onChange(async (value) => {
					this.plugin.settings.summaryCalloutType = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: 'LLM API Configuration' });

		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Your OpenAI API key (or compatible API key)')
			.addText(text => {
				text.inputEl.type = 'password';
				text.setPlaceholder('sk-...')
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('API URL')
			.setDesc('API endpoint URL (default is OpenAI, but you can use other compatible APIs)')
			.addText(text => text
				.setPlaceholder('https://api.openai.com/v1/chat/completions')
				.setValue(this.plugin.settings.apiUrl)
				.onChange(async (value) => {
					this.plugin.settings.apiUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Model name')
			.setDesc('The model to use for generating summaries')
			.addText(text => text
				.setPlaceholder('gpt-4.1-mini')
				.setValue(this.plugin.settings.modelName)
				.onChange(async (value) => {
					this.plugin.settings.modelName = value;
					await this.plugin.saveSettings();
				}));
	}
}
