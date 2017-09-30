const UglifyJSPlugin = require('uglifyjs-webpack-plugin')

const config = {
	entry: {
		"mother-mask": "./src/main.ts"
	},
	output: {
		filename: './dist/[name].js'
	},
	devtool: "source-map",
	resolve: {
		extensions: [".ts", ".tsx", ".js", ".json"]
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: ["awesome-typescript-loader"]
			},
			{ enforce: "pre", test: /\.js$/, loader: "source-map-loader" },
		]
	},
	plugins: [
	]
}


module.exports = config;