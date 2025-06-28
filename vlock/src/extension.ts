import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let codingMinutes = 0;
let interval: NodeJS.Timeout;
let refreshInterval: NodeJS.Timeout;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  // Create a status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.tooltip = "Vlock: Code Stats Tracker";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Track coding time based on window focus
  vscode.window.onDidChangeWindowState((state) => {
    if (state.focused) {
      startTimer();
    } else {
      stopTimer();
    }
  });

  // Register command to show info manually
  const disposable = vscode.commands.registerCommand('vlock.Vlock', async () => {
    const lines = await countTotalLines();
    const errors = countDiagnostics();
    vscode.window.showInformationMessage(`📄 Lines: ${lines} | ⏱️ Time: ${codingMinutes} min | ❌ Errors: ${errors}`);
  });

  context.subscriptions.push(disposable);

  // Auto-refresh every 1 minute
  startAutoRefresh();
}

function startTimer() {
  if (!interval) {
    interval = setInterval(() => codingMinutes++, 60000);
  }
}

function stopTimer() {
  if (interval) {
    clearInterval(interval);
    interval = undefined!;
  }
}

function startAutoRefresh() {
  updateStatusBar(); // initial update
  refreshInterval = setInterval(() => updateStatusBar(), 60000); // every 1 minute
}

async function updateStatusBar() {
  const lines = await countTotalLines();
  const errors = countDiagnostics();
  statusBarItem.text = `📄 ${lines} lines | ⏱️ ${codingMinutes} min | ❌ ${errors} errors`;
}

async function countTotalLines(): Promise<number> {
  const files = await vscode.workspace.findFiles(
    '**/*.{ts,js,py,cpp,sol,html,css}',
    '**/{node_modules,.git,out,.vscode}/**'
  );

  let totalLines = 0;

  for (const file of files) {
    try {
      const fileBytes = await vscode.workspace.fs.readFile(file);
      const content = Buffer.from(fileBytes).toString('utf8');
      totalLines += content.split('\n').length;
    } catch (err) {
      console.warn(`Cannot read: ${file.fsPath} - ${err}`);
    }
  }

  return totalLines;
}

function countDiagnostics(): number {
  const diagnostics = vscode.languages.getDiagnostics();
  return diagnostics.reduce((acc, [_, diags]) => {
    return acc + diags.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
  }, 0);
}

export function deactivate() {
  stopTimer();
  clearInterval(refreshInterval);
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}
