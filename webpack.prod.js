module.exports = {
	mode: 'production',
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
