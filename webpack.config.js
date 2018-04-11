const path = require('path');
var isProduction = process.argv.indexOf('-p') >= 0;

module.exports = {
	entry: path.join(__dirname, 'src', 'main'),
	mode: isProduction ? 'production' : 'development',
	output: {
		filename: isProduction ? 'dist/mother-mask.min.js' : 'dist/mother-mask.js',
		path: path.resolve(__dirname)
	},
	module: {
		rules: [
			{ test: /\.tsx?$/, loader: "ts-loader" },
			{
			test: /.jsx?$/,
			include: [
				path.resolve(__dirname, 'src')
			],
			exclude: [
				path.resolve(__dirname, 'node_modules'),
				path.resolve(__dirname, 'bower_components')
			],
			loader: 'babel-loader',
			query: {
				presets: ['es2015']
			}
		}]
	},
	resolve: {
		extensions: ['.json', '.js', '.jsx', '.css', '.ts', '.tsx', '.js']
	},
	devtool: 'source-map',
	devServer: {
		publicPath: path.join('/dist/')
	}
};