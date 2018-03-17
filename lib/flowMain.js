/* @flow */

/*
 Copyright (c) 2015-present, Facebook, Inc.
 All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 the root directory of this source tree.
 */

// Necessary to get the regenerator runtime, which transpiled async functions need
import * as _ from 'regenerator-runtime/runtime';
import * as path from 'path';
import * as vscode from 'vscode';

import type {ExtensionContext, Uri} from 'vscode';
import {setupDiagnostics} from './flowDiagnostics';
import {LanguageClient, LanguageClientOptions, ServerOptions, TransportKind} from 'vscode-languageclient';

import {checkNode, checkFlow, isFlowEnabled} from './utils'
import {clearWorkspaceCaches} from './pkg/flow-base/lib/FlowHelpers'

import {setupLogging} from "./flowLogging"

const languages = [
	{ language: 'javascript', scheme: 'file' },
	'javascriptreact'
]

export function activate(context:ExtensionContext): void {
	//User can disable flow for some projects that previously used flow, but it's not have actual typing
	if (!isFlowEnabled()) {
		return
	}
	global.vscode = vscode

	setupLogging()
	checkNode()
	checkFlow()

	// https://github.com/Microsoft/vscode/issues/7031 Workaround for language scoring for language and in-memory. Check in nearest Insiders build
	// context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: 'javascript' }, new CompletionSupport(), '.'));
	// Diagnostics
	setupDiagnostics(context);
	activateLanguageClient(context);
}

function activateLanguageClient(context: ExtensionContext): void {
	let serverModule = context.asAbsolutePath(path.join('node_modules', 'flow-language-server', 'lib', 'bin', 'cli.js'));
	let debugOptions = { execArgv: [ '--nolazy', '--debug=6009' ] };

	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc, args: [ '--node-ipc' ] },
		debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
	}

	let clientOptions: LanguageClientOptions = {
		documentSelector: languages,
		synchronize: {
			configurationSection: 'flow',
			// detect configuration changes
			fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{js,jsx,mjs,js.flow}')
		},
		uriConverters: {
			// disables URL-encoding for file URLs
			code2Protocol: (uri: Uri) => uri.toString(true)
		}
	}

	let disposable = new LanguageClient("flow-language-server", "Flow Language Server", serverOptions, clientOptions).start();
	context.subscriptions.push(disposable);
}

vscode.workspace.onDidChangeConfiguration(params => {
	clearWorkspaceCaches();
});
