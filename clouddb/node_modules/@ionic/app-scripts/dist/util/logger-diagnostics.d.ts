import { BuildContext } from './interfaces';
import { Diagnostic } from './logger';
export declare function printDiagnostics(context: BuildContext, diagnosticsType: string, diagnostics: Diagnostic[], consoleLogDiagnostics: boolean, writeHtmlDiagnostics: boolean): void;
export declare function clearDiagnosticsCache(): void;
export declare function clearDiagnostics(context: BuildContext, type: string): void;
export declare function hasDiagnostics(buildDir: string): boolean;
export declare function injectDiagnosticsHtml(buildDir: string, content: any): any;
export declare function getDiagnosticsHtmlContent(buildDir: string): string;
export declare const DiagnosticsType: {
    TypeScript: string;
    Sass: string;
    TsLint: string;
};
