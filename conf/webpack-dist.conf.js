const webpack = require('webpack');
const conf = require('./gulp.conf');
const path = require('path');

const pkg = require('../package.json');

module.exports = {
  module: {
    loaders: [
      {
        test: /.json$/,
        loaders: [
          'json'
        ]
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loaders: [
          'ng-annotate',
          'ts'
        ]
      },
      {
        test: /.html$/,
        loaders: [
          'html'
        ]
      }
    ]
  },
  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.NoErrorsPlugin(),
    new webpack.optimize.UglifyJsPlugin({
      include: /\.min\.js$/,
      compress: {unused: true, dead_code: true, warnings: false} // eslint-disable-line camelcase
    })
  ],
  output: {
    path: path.join(process.cwd(), conf.paths.dist),
    filename: '[name].js',
    libraryTarget: 'umd',
    library: pkg.name
  },
  externals: {
    angular: true,
    CSL: true,
    lodash: {
      amd: 'lodash',
      root: '_',
      commonjs: 'lodash',
      commonjs2: 'lodash'
    }
  },
  resolve: {
    extensions: [
      '',
      '.webpack.js',
      '.web.js',
      '.js',
      '.ts'
    ]
  },
  entry: {
    trc: `./${conf.path.src('index')}`,
    'trc.min': `./${conf.path.src('index')}`
  },
  ts: {
    configFileName: 'tsconfig.json'
  },
  tslint: {
    configuration: require('../tslint.json')
  }
};
