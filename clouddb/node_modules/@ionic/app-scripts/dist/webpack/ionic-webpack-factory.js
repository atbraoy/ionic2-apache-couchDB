"use strict";
var ionic_environment_plugin_1 = require('./ionic-environment-plugin');
var helpers_1 = require('../util/helpers');
function getIonicEnvironmentPlugin() {
    var context = helpers_1.getContext();
    return new ionic_environment_plugin_1.IonicEnvironmentPlugin(context.fileCache);
}
exports.getIonicEnvironmentPlugin = getIonicEnvironmentPlugin;
