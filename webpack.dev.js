module.exports = {
	mode: 'development',
	devtool: 'source-map',
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
					presets: ['@babel/react', '@babel/env'],
					plugins: [
						'@babel/transform-runtime',
						'@babel/transform-regenerator',
						'@babel/transform-async-to-generator',
						'@babel/proposal-class-properties',
						["@babel/proposal-decorators", { "proposal": "minimal", "legacy": true }],
						'@babel/proposal-do-expressions',
						'@babel/proposal-export-default-from',
						'@babel/proposal-export-namespace-from',
						'@babel/proposal-function-bind',
						'@babel/proposal-function-sent',
						'@babel/proposal-json-strings',
						'@babel/proposal-logical-assignment-operators',
						'@babel/proposal-nullish-coalescing-operator',
						'@babel/proposal-numeric-separator',
						'@babel/proposal-optional-chaining',
						["@babel/proposal-pipeline-operator", { "proposal": "minimal" }],
						'@babel/proposal-throw-expressions',
						'@babel/syntax-dynamic-import',
						'@babel/syntax-import-meta'
					]
				}
			},
		]
    }
}