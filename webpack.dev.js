module.exports = {
	mode: 'development',
	devtool: 'source-map',
	output: {
		filename: 'index.js'
	},
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				loader: 'babel-loader',
				exclude: /node_modules/
			},
		]
    }
}