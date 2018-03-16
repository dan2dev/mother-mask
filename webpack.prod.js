const merge = require('webpack-merge');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const common = require('./webpack.common.js');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
var OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');

module.exports = merge(common.config, {
	mode: "production",
	output: {
		filename: 'mother-mask.min.js'
	},
	plugins: [
		new UglifyJSPlugin({
			sourceMap: true,
			uglifyOptions: { ecma: 5},
		}),
		new ExtractTextPlugin('[name].min.css'),
		new OptimizeCssAssetsPlugin({
			assetNameRegExp: /\.min\.css$/g,
			cssProcessor: require('cssnano'),
			cssProcessorOptions: { discardComments: { removeAll: true } },
			canPrint: true
		  })
	]
});
