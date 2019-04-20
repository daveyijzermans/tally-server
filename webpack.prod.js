module.exports = {
	mode: 'production',
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				loader: 'babel-loader',
				exclude: /node_modules/
			},
		]
    },
  plugins: [
    new webpack.ProvidePlugin({
      jQuery: 'jquery'
    })
  ]
}
