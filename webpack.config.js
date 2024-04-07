const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    module: {
        rules: [
            {
                test: /\.glsl$/i,
                use: 'raw-loader',
            },
            {
                test: /\.tsx?$/,
                use: 'ts-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.glsl'],
    },
    entry: './src/index.ts',
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'src/index.html'
        })
    ],
    mode: "production"
};