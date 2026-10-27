# Bytescript for Visual Studio Code

Syntax highlighting, bracket matching and `--` line comments for
Bytescript (`.bs`) files.

## Install (from this repository)

1. Copy this `editors/vscode` folder to your VS Code extensions folder:
   - Windows: `%USERPROFILE%\.vscode\extensions\bytescript-1.1.0`
   - Linux/macOS: `~/.vscode/extensions/bytescript-1.1.0`
2. Restart VS Code and open any `.bs` file.

Or package it with [`vsce`](https://code.visualstudio.com/api/working-with-extensions/publishing-extension):
`npx @vscode/vsce package` inside this folder, then install the `.vsix`.
