"use strict";
var interfaces_1 = require('./util/interfaces');
var logger_1 = require('./util/logger');
var bundle_1 = require('./bundle');
var path_1 = require('path');
var fs_1 = require('fs');
function templateUpdate(event, htmlFilePath, context) {
    return new Promise(function (resolve) {
        var start = Date.now();
        var bundleOutputDest = bundle_1.getJsOutputDest(context);
        function failed() {
            context.transpileState = interfaces_1.BuildState.RequiresBuild;
            context.bundleState = interfaces_1.BuildState.RequiresUpdate;
            resolve();
        }
        try {
            var bundleSourceText = fs_1.readFileSync(bundleOutputDest, 'utf8');
            var newTemplateContent = fs_1.readFileSync(htmlFilePath, 'utf8');
            bundleSourceText = replaceBundleJsTemplate(bundleSourceText, newTemplateContent, htmlFilePath);
            if (bundleSourceText) {
                // awesome, all good and template updated in the bundle file
                var logger_2 = new logger_1.Logger("template update");
                logger_2.setStartTime(start);
                fs_1.writeFile(bundleOutputDest, bundleSourceText, { encoding: 'utf8' }, function (err) {
                    if (err) {
                        // eww, error saving
                        logger_2.fail(err);
                        failed();
                    }
                    else {
                        // congrats, all gud
                        logger_1.Logger.debug("updateBundledJsTemplate, updated: " + htmlFilePath);
                        context.templateState = interfaces_1.BuildState.SuccessfulBuild;
                        logger_2.finish();
                        resolve();
                    }
                });
            }
            else {
                failed();
            }
        }
        catch (e) {
            logger_1.Logger.debug("updateBundledJsTemplate error: " + e);
            failed();
        }
    });
}
exports.templateUpdate = templateUpdate;
function inlineTemplate(sourceText, sourcePath) {
    var componentDir = path_1.parse(sourcePath).dir;
    var match;
    var replacement;
    var lastMatch = null;
    while (match = getTemplateMatch(sourceText)) {
        if (match.component === lastMatch) {
            // panic! we don't want to melt any machines if there's a bug
            logger_1.Logger.debug("Error matching component: " + match.component);
            return sourceText;
        }
        lastMatch = match.component;
        if (match.templateUrl === '') {
            logger_1.Logger.error("Error @Component templateUrl missing in: \"" + sourcePath + "\"");
            return sourceText;
        }
        replacement = updateTemplate(componentDir, match);
        if (replacement) {
            sourceText = sourceText.replace(match.component, replacement);
        }
    }
    return sourceText;
}
exports.inlineTemplate = inlineTemplate;
function updateTemplate(componentDir, match) {
    var htmlFilePath = path_1.join(componentDir, match.templateUrl);
    try {
        var templateContent = fs_1.readFileSync(htmlFilePath, 'utf8');
        return replaceTemplateUrl(match, htmlFilePath, templateContent);
    }
    catch (e) {
        logger_1.Logger.error("template error, \"" + htmlFilePath + "\": " + e);
    }
    return null;
}
exports.updateTemplate = updateTemplate;
function replaceTemplateUrl(match, htmlFilePath, templateContent) {
    var orgTemplateProperty = match.templateProperty;
    var newTemplateProperty = getTemplateFormat(htmlFilePath, templateContent);
    return match.component.replace(orgTemplateProperty, newTemplateProperty);
}
exports.replaceTemplateUrl = replaceTemplateUrl;
function replaceBundleJsTemplate(bundleSourceText, newTemplateContent, htmlFilePath) {
    var prefix = getTemplatePrefix(htmlFilePath);
    var startIndex = bundleSourceText.indexOf(prefix);
    var isStringified = false;
    if (startIndex === -1) {
        prefix = stringify(prefix);
        isStringified = true;
    }
    startIndex = bundleSourceText.indexOf(prefix);
    if (startIndex === -1) {
        return null;
    }
    var suffix = getTemplateSuffix(htmlFilePath);
    if (isStringified) {
        suffix = stringify(suffix);
    }
    var endIndex = bundleSourceText.indexOf(suffix, startIndex + 1);
    if (endIndex === -1) {
        return null;
    }
    var oldTemplate = bundleSourceText.substring(startIndex, endIndex + suffix.length);
    var newTemplate = getTemplateFormat(htmlFilePath, newTemplateContent);
    if (isStringified) {
        newTemplate = stringify(newTemplate);
    }
    var lastChange = null;
    while (bundleSourceText.indexOf(oldTemplate) > -1 && bundleSourceText !== lastChange) {
        lastChange = bundleSourceText = bundleSourceText.replace(oldTemplate, newTemplate);
    }
    return bundleSourceText;
}
exports.replaceBundleJsTemplate = replaceBundleJsTemplate;
function stringify(str) {
    str = JSON.stringify(str);
    return str.substr(1, str.length - 2);
}
function getTemplateFormat(htmlFilePath, content) {
    // turn the template into one line and espcape single quotes
    content = content.replace(/\r|\n/g, '\\n');
    content = content.replace(/\'/g, '\\\'');
    return getTemplatePrefix(htmlFilePath) + "'" + content + "'" + getTemplateSuffix(htmlFilePath);
}
exports.getTemplateFormat = getTemplateFormat;
function getTemplatePrefix(htmlFilePath) {
    return "template:/*ion-inline-start:\"" + path_1.resolve(htmlFilePath) + "\"*/";
}
function getTemplateSuffix(htmlFilePath) {
    return "/*ion-inline-end:\"" + path_1.resolve(htmlFilePath) + "\"*/";
}
function getTemplateMatch(str) {
    var match = COMPONENT_REGEX.exec(str);
    if (match) {
        return {
            start: match.index,
            end: match.index + match[0].length,
            component: match[0],
            templateProperty: match[3],
            templateUrl: match[5].trim()
        };
    }
    return null;
}
exports.getTemplateMatch = getTemplateMatch;
var COMPONENT_REGEX = /Component\s*?\(\s*?(\{([\s\S]*?)(\s*templateUrl\s*:\s*(['"`])(.*?)(['"`])\s*?)([\s\S]*?)}\s*?)\)/m;
