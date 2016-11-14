"use strict";
var logger_1 = require('./logger');
var helpers_1 = require('./helpers');
var path_1 = require('path');
var fs_1 = require('fs');
var chalk = require('chalk');
function printDiagnostics(context, diagnosticsType, diagnostics, consoleLogDiagnostics, writeHtmlDiagnostics) {
    if (diagnostics && diagnostics.length) {
        if (consoleLogDiagnostics) {
            diagnostics.forEach(consoleLogDiagnostic);
        }
        if (writeHtmlDiagnostics) {
            var content = diagnostics.map(generateDiagnosticHtml);
            var fileName = getDiagnosticsFileName(context.buildDir, diagnosticsType);
            fs_1.writeFileSync(fileName, content.join('\n'), { encoding: 'utf8' });
        }
    }
}
exports.printDiagnostics = printDiagnostics;
function consoleLogDiagnostic(d) {
    if (d.level === 'warn') {
        logger_1.Logger.warn(d.header);
    }
    else {
        logger_1.Logger.error(d.header);
    }
    logger_1.Logger.wordWrap([d.messageText]).forEach(function (m) {
        console.log(m);
    });
    console.log('');
    if (d.lines && d.lines.length) {
        var lines = removeWhitespaceIndent(d.lines);
        lines.forEach(function (l) {
            if (!isMeaningfulLine(l.text)) {
                return;
            }
            var msg = "L" + l.lineNumber + ":  ";
            while (msg.length < logger_1.Logger.INDENT.length) {
                msg = ' ' + msg;
            }
            var text = l.text;
            if (l.errorCharStart > -1) {
                text = consoleHighlightError(text, l.errorCharStart, l.errorLength);
            }
            msg = chalk.dim(msg);
            if (d.syntax === 'js') {
                msg += jsConsoleSyntaxHighlight(text);
            }
            else if (d.syntax === 'css') {
                msg += cssConsoleSyntaxHighlight(text, l.errorCharStart);
            }
            else {
                msg += text;
            }
            console.log(msg);
        });
        console.log('');
    }
}
function consoleHighlightError(errorLine, errorCharStart, errorLength) {
    var rightSideChars = errorLine.length - errorCharStart + errorLength - 1;
    while (errorLine.length + logger_1.Logger.INDENT.length > logger_1.Logger.MAX_LEN) {
        if (errorCharStart > (errorLine.length - errorCharStart + errorLength) && errorCharStart > 5) {
            // larger on left side
            errorLine = errorLine.substr(1);
            errorCharStart--;
        }
        else if (rightSideChars > 1) {
            // larger on right side
            errorLine = errorLine.substr(0, errorLine.length - 1);
            rightSideChars--;
        }
        else {
            break;
        }
    }
    var lineChars = [];
    var lineLength = Math.max(errorLine.length, errorCharStart + errorLength);
    for (var i = 0; i < lineLength; i++) {
        var chr = errorLine.charAt(i);
        if (i >= errorCharStart && i < errorCharStart + errorLength) {
            chr = chalk.bgRed(chr === '' ? ' ' : chr);
        }
        lineChars.push(chr);
    }
    return lineChars.join('');
}
var diagnosticsHtmlCache = {};
function clearDiagnosticsCache() {
    diagnosticsHtmlCache = {};
}
exports.clearDiagnosticsCache = clearDiagnosticsCache;
function clearDiagnostics(context, type) {
    try {
        delete diagnosticsHtmlCache[type];
        fs_1.unlinkSync(getDiagnosticsFileName(context.buildDir, type));
    }
    catch (e) { }
}
exports.clearDiagnostics = clearDiagnostics;
function hasDiagnostics(buildDir) {
    loadDiagnosticsHtml(buildDir);
    var keys = Object.keys(diagnosticsHtmlCache);
    for (var i = 0; i < keys.length; i++) {
        if (typeof diagnosticsHtmlCache[keys[i]] === 'string') {
            return true;
        }
    }
    return false;
}
exports.hasDiagnostics = hasDiagnostics;
function loadDiagnosticsHtml(buildDir) {
    try {
        if (diagnosticsHtmlCache[exports.DiagnosticsType.TypeScript] === undefined) {
            diagnosticsHtmlCache[exports.DiagnosticsType.TypeScript] = fs_1.readFileSync(getDiagnosticsFileName(buildDir, exports.DiagnosticsType.TypeScript), 'utf8');
        }
    }
    catch (e) {
        diagnosticsHtmlCache[exports.DiagnosticsType.TypeScript] = false;
    }
    try {
        if (diagnosticsHtmlCache[exports.DiagnosticsType.Sass] === undefined) {
            diagnosticsHtmlCache[exports.DiagnosticsType.Sass] = fs_1.readFileSync(getDiagnosticsFileName(buildDir, exports.DiagnosticsType.Sass), 'utf8');
        }
    }
    catch (e) {
        diagnosticsHtmlCache[exports.DiagnosticsType.Sass] = false;
    }
}
function injectDiagnosticsHtml(buildDir, content) {
    if (!hasDiagnostics(buildDir)) {
        return content;
    }
    var contentStr = content.toString();
    var diagnosticsHtml = [];
    diagnosticsHtml.push("<div id=\"ion-diagnostics\">");
    diagnosticsHtml.push(getDiagnosticsHtmlContent(buildDir));
    diagnosticsHtml.push("</div>");
    var match = contentStr.match(/<body>(?![\s\S]*<body>)/i);
    if (match) {
        contentStr = contentStr.replace(match[0], match[0] + '\n' + diagnosticsHtml.join('\n'));
    }
    else {
        contentStr = diagnosticsHtml.join('\n') + contentStr;
    }
    return contentStr;
}
exports.injectDiagnosticsHtml = injectDiagnosticsHtml;
function getDiagnosticsHtmlContent(buildDir) {
    loadDiagnosticsHtml(buildDir);
    var diagnosticsHtml = [];
    var keys = Object.keys(diagnosticsHtmlCache);
    for (var i = 0; i < keys.length; i++) {
        if (typeof diagnosticsHtmlCache[keys[i]] === 'string') {
            diagnosticsHtml.push(diagnosticsHtmlCache[keys[i]]);
        }
    }
    return diagnosticsHtml.join('\n');
}
exports.getDiagnosticsHtmlContent = getDiagnosticsHtmlContent;
function generateDiagnosticHtml(d) {
    var c = [];
    c.push("<div class=\"ion-diagnostic\">");
    c.push("<div class=\"ion-diagnostic-masthead\" title=\"" + escapeHtml(d.type) + " error: " + escapeHtml(d.code) + "\">");
    var header = helpers_1.titleCase(d.type) + " " + helpers_1.titleCase(d.level);
    c.push("<div class=\"ion-diagnostic-header\">" + escapeHtml(header) + "</div>");
    c.push("<div class=\"ion-diagnostic-message\" data-error-code=\"" + escapeHtml(d.type) + "-" + escapeHtml(d.code) + "\">" + escapeHtml(d.messageText) + "</div>");
    c.push("</div>"); // .ion-diagnostic-masthead
    c.push("<div class=\"ion-diagnostic-file\">");
    c.push("<div class=\"ion-diagnostic-file-header\">" + escapeHtml(d.relFileName) + "</div>");
    if (d.lines && d.lines.length) {
        c.push("<div class=\"ion-diagnostic-blob\">");
        c.push("<table class=\"ion-diagnostic-table\">");
        var lines = removeWhitespaceIndent(d.lines);
        lines.forEach(function (l) {
            var trCssClass = '';
            var code = l.text;
            if (l.errorCharStart > -1) {
                code = htmlHighlightError(code, l.errorCharStart, l.errorLength);
                trCssClass = ' class="ion-diagnostic-error-line"';
            }
            c.push("<tr" + trCssClass + ">");
            c.push("<td class=\"ion-diagnostic-blob-num\" data-line-number=\"" + l.lineNumber + "\"></td>");
            c.push("<td class=\"ion-diagnostic-blob-code\">" + code + "</td>");
            c.push("</tr>");
        });
        c.push("</table>");
        c.push("</div>"); // .ion-diagnostic-blob
    }
    c.push("</div>"); // .ion-diagnostic-file
    c.push("</div>"); // .ion-diagnostic
    return c.join('\n');
}
function htmlHighlightError(errorLine, errorCharStart, errorLength) {
    var lineChars = [];
    var lineLength = Math.max(errorLine.length, errorCharStart + errorLength);
    for (var i = 0; i < lineLength; i++) {
        var chr = errorLine.charAt(i);
        if (i >= errorCharStart && i < errorCharStart + errorLength) {
            chr = "<span class=\"ion-diagnostics-error-chr\">" + (chr === '' ? ' ' : chr) + "</span>";
        }
        lineChars.push(chr);
    }
    return lineChars.join('');
}
function jsConsoleSyntaxHighlight(text) {
    if (text.trim().startsWith('//')) {
        return chalk.dim(text);
    }
    var words = text.split(' ').map(function (word) {
        if (JS_KEYWORDS.indexOf(word) > -1) {
            return chalk.cyan(word);
        }
        return word;
    });
    return words.join(' ');
}
function cssConsoleSyntaxHighlight(text, errorCharStart) {
    var cssProp = true;
    var safeChars = 'abcdefghijklmnopqrstuvwxyz-_';
    var notProp = '.#,:}@$[]/*';
    var chars = [];
    for (var i = 0; i < text.length; i++) {
        var c = text.charAt(i);
        if (c === ';' || c === '{') {
            cssProp = true;
        }
        else if (notProp.indexOf(c) > -1) {
            cssProp = false;
        }
        if (cssProp && safeChars.indexOf(c.toLowerCase()) > -1) {
            chars.push(chalk.cyan(c));
            continue;
        }
        chars.push(c);
    }
    return chars.join('');
}
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
function removeWhitespaceIndent(orgLines) {
    var lines = orgLines.slice();
    for (var i = 0; i < 100; i++) {
        if (!eachLineHasLeadingWhitespace(lines)) {
            return lines;
        }
        for (var i = 0; i < lines.length; i++) {
            lines[i].text = lines[i].text.substr(1);
            lines[i].errorCharStart--;
            if (!lines[i].text.length) {
                return lines;
            }
        }
    }
    return lines;
}
function eachLineHasLeadingWhitespace(lines) {
    if (!lines.length) {
        return false;
    }
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].text.length < 1) {
            return false;
        }
        var firstChar = lines[i].text.charAt(0);
        if (firstChar !== ' ' && firstChar !== '\t') {
            return false;
        }
    }
    return true;
}
var JS_KEYWORDS = [
    'as',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'export',
    'extends',
    'finally',
    'for',
    'from',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'new',
    'return',
    'super',
    'switch',
    'this',
    'throw',
    'try',
    'typeof',
    'var',
    'void',
    'while',
];
function getDiagnosticsFileName(buildDir, type) {
    return path_1.join(buildDir, ".ion-diagnostic-" + type + ".html");
}
function isMeaningfulLine(line) {
    if (line) {
        line = line.trim();
        if (line.length) {
            return (MEH_LINES.indexOf(line) < 0);
        }
    }
    return false;
}
var MEH_LINES = [';', ':', '{', '}', '(', ')', '/**', '/*', '*/', '*', '({', '})'];
exports.DiagnosticsType = {
    TypeScript: 'typescript',
    Sass: 'sass',
    TsLint: 'tslint'
};
