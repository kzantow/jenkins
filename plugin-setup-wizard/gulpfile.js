// 1) jenkins js builder
var builder = require('jenkins-js-builder');

// 2) gulp
var gulp = require('gulp');

// hack to prevent the build from breaking during watch
var plumber = require('gulp-plumber');
var handleError = function(err) {
  console.log(err.toString());
  this.emit('end');
};

// 3) gulp plugins
var jshint = require('gulp-jshint');
var sass = require('gulp-sass');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');

//4) vars
var pluginName = 'pluginSetupWizard';
var src = './src/main/js';
var dest = './target/generated-adjuncts';

// Need to override the default src locations.
builder.src('./src/main/js');
builder.tests('./src/test/js');

// Create the jenkins.js JavaScript bundle.
var bundleSpec = builder.bundle('src/main/js/'+pluginName+'.js', pluginName)
    .withExternalModuleMapping('jquery-detached', 'jquery-detached:jquery2')
    .withExternalModuleMapping('bootstrap-detached', 'bootstrap:bootstrap3')
    .withExternalModuleMapping('moment', 'momentjs:momentjs2')
    .withExternalModuleMapping('handlebars', 'handlebars:handlebars3')
    .inDir(dest);
    
gulp.task('js:watch', function() {
	gulp.watch(src + '/**/*.js', ['rebundle']);
});

gulp.task('hbs:watch', function() {
	gulp.watch(src + '/**/*.hbs', ['rebundle']);
});

gulp.task('scss', function(){
	gulp.src('src/main/scss/**/*.scss')
		.pipe(sourcemaps.init())
		.pipe(sass())
		.pipe(sourcemaps.write())
		.pipe(sass().on('error', sass.logError))
		.pipe(concat(pluginName+'.css'))
		.pipe(gulp.dest(dest));
});

gulp.task('scss:watch', function() {
	gulp.watch('src/main/scss/**/*.scss', ['scss']);
});

gulp.task('lint', function(){
    return gulp.src('src/main/js/**/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('resources:watch', function() {
	gulp.watch(dest+'/*.*', ['copy-to-resources']);
});

gulp.task('copy-to-resources', function() {
    gulp.src(dest+'/*.*')
	    .pipe(gulp.dest('./target/classes'));
});

// Use the predefined tasks from jenkins-js-builder.
builder.defineTasks(['test', 'bundle', 'rebundle']);

// Watch Files For Changes
gulp.task('watch', ['scss:watch', 'js:watch', 'hbs:watch', 'resources:watch']);

gulp.task('default', ['lint', 'scss', 'bundle']);

// Use this to run default first and get modules bundled
gulp.task('test-all', ['default', 'test']);