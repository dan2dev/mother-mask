const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const webpack = require("webpack");
const config = require("./webpack.config.js");

config.output.filename = './dist/[name].min.js';
config.plugins.push(new webpack.optimize.UglifyJsPlugin({
}));

module.exports = config;