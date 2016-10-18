const fs = require('fs');
const gulp = require('gulp');

const conf = require('./conf/gulp.conf');

fs.readdirSync(conf.paths.tasks)
  .filter(file => (/\.js$/i).test(file))
  .forEach(file => require(`./${conf.path.tasks(file)}`));

gulp.task('build', ['other', 'webpack:dist']);
gulp.task('test', ['karma:single-run']);
gulp.task('test:auto', ['karma:auto-run']);
gulp.task('default', ['clean'], () => gulp.start('build'));
