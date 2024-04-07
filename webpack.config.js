const path = require('path');

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
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.glsl'],
    },
    entry: './src/index.ts',
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
    },
    mode: "production"
};