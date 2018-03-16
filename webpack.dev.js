const merge = require('webpack-merge');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const LiveReloadPlugin = require('webpack-livereload-plugin');
const common = require('./webpack.common.js');

module.exports = merge(common.config, {
	mode: "development",
	output: {
		filename: 'mother-mask.js'
	},
	devtool: 'inline-source-map',
	devServer: {
		contentBase: common.distPath
	},
	plugins: [
		new ExtractTextPlugin('[name].css'),
		new LiveReloadPlugin({})
	]
});
