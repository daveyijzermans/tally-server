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
				exclude: /node_modules/,
				options: {
					presets: ['react', 'stage-0', 'es2015'],
					plugins: [
						'transform-runtime',
						'transform-regenerator',
						'transform-async-to-generator',
						'transform-class-properties'
					]
				}
			},
		]
    }
}
