import { Plugin, TFile, Notice, PluginSettingTab, App, Setting } from 'obsidian';

interface OzanClearImagesSettings {
	deleteOption: string;
}

const DEFAULT_SETTINGS: OzanClearImagesSettings = {
	deleteOption: '.trash'
}

export default class OzanClearImages extends Plugin {

	settings: OzanClearImagesSettings;

	async onload() {
		console.log("Loading oz-clear-unused-images plugin")
		this.addSettingTab(new OzanClearImagesSettingsTab(this.app, this));
		await this.loadSettings();
		this.addCommand({
			id: 'clear-images-obsidian',
			name: 'Clear Unused Images in Vault',
			callback: () => this.clearUnusedImages()
		});
	}

	onunload() {
		console.log('Unloading oz-clear-unused-images plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	imageRegex = /.*(jpe?g|png|gif|svg|bmp)/;
	imageExtensions: Set<string> = new Set(['jpeg', 'jpg', 'png', 'gif', 'svg', 'bmp']);

	// Compare Used Images with all images and return unused ones
	clearUnusedImages = async () => {
		var unused_images: TFile[] = this.getUnusedImages()
		var len = unused_images.length;
		if (len > 0) {
			console.log('[+] Deleting ' + len + ' images.');
			await this.deleteFilesInTheList(unused_images);
			new Notice(len + ' image(s) in total deleted.');
			console.log('[+] Delete completed.');
		} else {
			new Notice('All images are used. Nothing was deleted.');
		}
	}

	// Create the List of Unused Images
	getUnusedImages = () => {
		var all_images_in_vault: TFile[] = this.getAllImagesInVault();
		var unused_images: TFile[] = [];
		var used_images_set: Set<string>;

		// Get Used Images in All Markdown Files
		used_images_set = this.getImagePathSetForVault();

		// Compare All Images vs Used Images
		all_images_in_vault.forEach(img => {
			if (!used_images_set.has(img.path)) unused_images.push(img)
		});

		return unused_images
	}

	// Clear Images From the Provided List
	deleteFilesInTheList = async (fileList: TFile[]) => {
		var deleteOption = this.settings.deleteOption
		for (let file of fileList) {
			if (deleteOption === '.trash') {
				await this.app.vault.trash(file, false);
				console.log('Moved to Obsidian Trash: ' + file.path);
			} else if (deleteOption === 'system-trash') {
				await this.app.vault.trash(file, true);
				console.log('Moved to System Trash: ' + file.path);
			} else if (deleteOption === 'permanent') {
				await this.app.vault.delete(file);
				console.log('Deleted: ' + file.path);
			}
		}
	}

	// Getting all available images saved in vault
	getAllImagesInVault = (): TFile[] => {
		let allFiles: TFile[] = this.app.vault.getFiles();
		let images: TFile[] = [];
		for (let i = 0; i < allFiles.length; i++) {
			if (this.imageExtensions.has(allFiles[i].extension)) {
				images.push(allFiles[i]);
			}
		}
		return images;
	}

	// New Method for Getting All Used Images
	getImagePathSetForVault = (): Set<string> => {
		var images_set: Set<string> = new Set();
		var resolvedLinks = this.app.metadataCache.resolvedLinks;
		if (resolvedLinks) {
			for (const [md_file, links] of Object.entries(resolvedLinks)) {
				for (const [file_path, nr] of Object.entries(resolvedLinks[md_file])) {
					var image_match = file_path.match(this.imageRegex);
					if (image_match) images_set.add(image_match[0]);
				}
			}
		}
		return images_set
	}

}

class OzanClearImagesSettingsTab extends PluginSettingTab {

	plugin: OzanClearImages;

	constructor(app: App, plugin: OzanClearImages) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {

		let { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Clear Images Settings" });

		new Setting(containerEl)
			.setName('Deleted Image Destination')
			.setDesc('Select where you want images to be moved once they are deleted')
			.addDropdown((dropdown) => {
				dropdown.addOption('permanent', 'Delete Permanently');
				dropdown.addOption('.trash', 'Move to Obsidian Trash');
				dropdown.addOption('system-trash', 'Move to System Trash');
				dropdown.setValue(this.plugin.settings.deleteOption);
				dropdown.onChange((option) => {
					this.plugin.settings.deleteOption = option;
					this.plugin.saveSettings();
				})
			})

	}
}