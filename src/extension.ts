import * as vscode from 'vscode';
import * as freetype from 'freetype2';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('pepero-formatter.format', () => {
		const { activeTextEditor } = vscode.window;
		if (!activeTextEditor) {
			vscode.window.showErrorMessage('No active text editor');
			return;
		}

		const fallbackFontface = freetype.NewFace(
			path.join(__dirname, '../fonts/NanumBarunGothic.otf'),
		);
		fallbackFontface.setCharSize(0, 64, 0, 0);

		vscode.window.showInputBox({
			prompt: 'Enter to format',
			placeHolder: '빼빼로',
		}).then((value) => {
			if (!value) {
				vscode.window.showErrorMessage('Please enter a value');
				return;
			}

			const { document } = activeTextEditor;
			const bitmaps = getBitmapFromText(fallbackFontface, fallbackFontface, value);

			const bitArrays = bitmaps.map((bitmap) => getBitArray(bitmap.buffer));

			const text = document.getText();

			const filteredText = text.replace(/[\r\n\t ]/g, '');
			let index = 0;

			const maxheight = Math.max(...bitmaps.map((bitmap) => bitmap.height));

			const rows: string[] = [];
			for (let i = 0; i < maxheight; i++) {
				let row = "";

				for (let j = 0; j < bitmaps.length; j++) {
					if (i < bitmaps[j].height) {
						const bitArray = bitArrays[j];
						const bits = bitArray.slice(i * (bitmaps[j].width), (i + 1) * (bitmaps[j].width));
						row = row + (bits.map((bit => {
							const res = bit ? filteredText[index % filteredText.length] : ' ';
							if (bit) {
								index++;
							}

							return res;
						}))).join('');
					}
					else {
						row = row + ' '.repeat(bitmaps[j].width);
					}
				}

				rows.push(row);
			}

			const edit = new vscode.WorkspaceEdit();
			edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), rows.join('\n'));
			vscode.workspace.applyEdit(edit);
		});
	});

	context.subscriptions.push(disposable);
}

function getBitmapFromText(font: freetype.FontFace, fallbackFont: freetype.FontFace, text: string) {
	const charCodes = text.split('').map((char) => char.charCodeAt(0));
	console.log(charCodes);
	const bitmaps = charCodes.map((charCode) => {
		const glyph = font.loadChar(charCode, {
			render: true,
			monochrome: true,
			color: false,
			ignoreTransform: true,
		});

		if (!glyph.bitmap) {
			return fallbackFont.loadChar(charCode).bitmap!;
		}

		return glyph.bitmap;
	});

	console.log(bitmaps);

	return bitmaps;
}

function getBitArray(bitmap: Buffer) {
	const bitArray = [];
	for (let i = 0; i < bitmap.length; i++) {
		const byte = bitmap[i];
		for (let j = 7; j >= 0; j--) {
			bitArray.push((byte >> j) & 1);
		}
	}

	return bitArray;
}

// This method is called when your extension is deactivated
export function deactivate() { }
