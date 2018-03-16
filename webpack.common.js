const ExtractTextPlugin = require('extract-text-webpack-plugin');
const path = require('path');
const entry = {
	'bundle': './src/main.ts'
};
const distPath = './dist';
const exclude = /(node_modules)|(dist)|(lib)/;

// output: {
// 	filename: '[name].js',
// 	path: path.resolve(distPath)
// },

const config = {
	entry: entry,
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].[chunkhash].js'
    },

	devtool: 'source-map',
	resolve: {
		extensions: ['.js', '.ts', '.tsx', '.jsx', '.json', '.scss', '.less', '.css'],
		alias: {}
	},
	module: {
		rules: [{
			test: /\.json$/,
			exclude: exclude,
			loader: 'json-loader'
		},
		{
			test: /\.html?$/,
			exclude: exclude,
			loader: 'string-loader'
		},
		{
			test: /\.js$/,
			loader: 'babel-loader',
			exclude: exclude
		},
		{
			test: /\.tsx?$/,
			loader: 'awesome-typescript-loader'
		},
		{
			test: /\.(eot|svg|ttf|woff|woff2)(\?\S*)?$/,
			loader: 'file-loader'
		},
		{
			test: /\.(png|jpe?g|gif|svg)(\?\S*)?$/,
			loader: 'file-loader',
			query: {
				name: '[name].[ext]?[hash]'
			}
		},
		{
			enforce: 'pre',
			test: /\.js$/,
			loader: 'source-map-loader'
		}, {
			test: /\.(css|sass|scss)$/,
			use: ExtractTextPlugin.extract({
				use: ['raw-loader', 'sass-loader'],
			})
		}
		]
	},
	externals: {
		'react': 'React',
		'react-dom': 'ReactDOM'
	}
};
module.exports = {
	config,
	distPath
};
