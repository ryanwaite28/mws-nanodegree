const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();
const runSequence = require('run-sequence');
const del = require('del');
// const assign = require('lodash/object/assign');
const browserify = require('browserify');
const watchify = require('watchify');
const babelify = require('babelify');
const hbsfy = require('hbsfy');
const source = require('vinyl-source-stream');
const mergeStream = require('merge-stream');
const through = require('through2');
const rename = require('gulp-rename');
const cleanCSS = require('gulp-clean-css');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const less = require('gulp-less');
const babel = require('gulp-babel');
const browserSync = require('browser-sync').create();
const transform = require('vinyl-transform');
const buffer = require('vinyl-buffer');
const streamify = require('gulp-streamify');
const minify = require('gulp-minify');

const args = process.argv.slice(3);

const paths = {
  styles: {
    src: 'css/**/*.css',
    dest: 'client/css/'
  },
  scripts: {
    src: 'js/**/*.js',
    dest: 'client/js/'
  }
};

// Functions

function styles() {
  return gulp.src(paths.styles.src)
    .pipe(cleanCSS())
    .pipe(concat('grand.min.css'))
    .pipe(gulp.dest(paths.styles.dest));
}

function browserify_dbhelper() {
  return browserify('js/dbhelper.js')
    .bundle()
    .pipe(source('js/dbhelper.js'))
    .pipe(rename('dbhelper-b.js'))
    .pipe(gulp.dest('js/'));
}
function browserify_main() {
  return browserify('js/main.js')
    .bundle()
    .pipe(source('js/main.js'))
    .pipe(rename('main-b.js'))
    .pipe(gulp.dest('js/'));
}

function minify_dbhelper() {
  return gulp.src('js/dbhelper.min.js', { sourcemaps: true })
    .pipe(uglify())
    .pipe(gulp.dest('client/js/'));
}
function minify_main() {
  return gulp.src('js/main.min.js', { sourcemaps: true })
    .pipe(uglify())
    .pipe(gulp.dest('client/js/'));
}
function minify_r_info() {
  return gulp.src('js/restaurant_info.js')
    .pipe(babel())
    .pipe(uglify())
    .pipe(rename('restaurant_info.min.js'))
    .pipe(gulp.dest('js/'));
}

function compile_dbhelper(callback) {
  runSequence('browserify_dbhelper', 'minify_dbhelper', callback);
}
function compile_main(callback) {
  runSequence('browserify_main', 'minify_main', callback);
}

function build(callback) {

}

gulp.task('styles', styles);

gulp.task('browserify_dbhelper', browserify_dbhelper);
gulp.task('browserify_main', browserify_main);
gulp.task('minify_dbhelper', minify_dbhelper);
gulp.task('minify_main', minify_main);
gulp.task('minify_r_info', minify_r_info);
gulp.task('compile_dbhelper', compile_dbhelper);
gulp.task('compile_main', compile_main);

gulp.task('build', build);

gulp.task('watch', function() {
  gulp.watch('js/dbhelper.js', browserify_dbhelper);
  gulp.watch('js/main.js', browserify_main);
  gulp.watch('js/restaurant_info.js', minify_r_info);

  gulp.watch(paths.styles.src, styles);
});


// server-watch
