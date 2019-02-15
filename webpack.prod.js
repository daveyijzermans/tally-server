module.exports = {
	mode: 'production',
	output: {
		filename: 'app.js'
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
