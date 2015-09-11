// 1) jenkins js builder
var builder = require('jenkins-js-builder');

// 2) gulp
var gulp = require('gulp');

// 3) gulp plugins
var jshint = require('gulp-jshint');
var sass = require('gulp-sass');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');

//4) vars
var pluginName = 'plugin-setup-wizard';
var src = './src/main/js';
var dest = './target/generated-sources/js-module';

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
	gulp.watch(dest+'/*.js', ['copy-to-resources']);
});

gulp.task('copy-to-resources', function() {
    gulp.src(dest+'/*.js')
	    .pipe(gulp.dest('./target/classes'));
});

// Use the predefined tasks from jenkins-js-builder.
builder.defineTasks(['test', 'bundle', 'rebundle']);

// Watch Files For Changes
gulp.task('watch', ['scss:watch', 'js:watch', 'hbs:watch', 'resources:watch']);

gulp.task('default', ['lint', 'scss', 'bundle']);



















var handlebars = require('handlebars');


/* browserify task
---------------
Bundle javascripty things with browserify!

This task is set up to generate multiple separate bundles, from
different sources, and to use Watchify when run from the default task.

See browserify.bundleConfigs in gulp/config.js
*/

var browserify   = require('browserify');
var browserSync  = require('browser-sync');
var watchify     = require('watchify');
var mergeStream  = require('merge-stream');
var gulp         = require('gulp');
var source       = require('vinyl-source-stream');
var _            = require('lodash');
var hbsfy        = require('hbsfy');

var gutil        = require('gulp-util');
var prettyHrtime = require('pretty-hrtime');
var startTime;

var bundleLogger = {
  start: function(filepath) {
	    startTime = process.hrtime();
	    gutil.log('Bundling', gutil.colors.green(filepath) + '...');
  },

  watch: function(bundleName) {
    gutil.log('Watching files required by', gutil.colors.yellow(bundleName));
  },

  end: function(filepath) {
    var taskTime = process.hrtime(startTime);
    var prettyTime = prettyHrtime(taskTime);
    gutil.log('Bundled', gutil.colors.green(filepath), 'in', gutil.colors.magenta(prettyTime));
  }
};

var notify = require("gulp-notify");

var handleErrors = function() {

  var args = Array.prototype.slice.call(arguments);

  // Send error to notification center with gulp-notify
  notify.onError({
    title: "Compile Error",
    message: "<%= error %>"
  }).apply(this, args);

  // Keep gulp from hanging on this task
  this.emit('end');
};

var config = {
    // A separate bundle will be generated for each
    // bundle config in the list below
    bundleConfigs: [{
      entries: 'src/main/js/'+pluginName+'.js',
      dest: dest,
      outputName: pluginName+'.js',
      // Additional file extentions to make optional
      extensions: ['.js', '.hbs'],
      // list of modules to make require-able externally
      require: ['lodash','jquery-detached', 'bootstrap-detached'],
      // See https://github.com/greypants/gulp-starter/issues/87 for note about
      // why this is 'backbone/node_modules/underscore' and not 'underscore'
      // list of externally available modules to exclude from the bundle
      external: ['jquery']
    }]
  };

var browserifyTask = function(devMode) {
	var browserifyThis = function(bundleConfig) {
	
	 if(devMode) {
	   // Add watchify args and debug (sourcemaps) option
	   _.extend(bundleConfig, watchify.args, { debug: true });
	   // A watchify require/external bug that prevents proper recompiling,
	   // so (for now) we'll ignore these options during development. Running
	   // `gulp browserify` directly will properly require and externalize.
	   bundleConfig = _.omit(bundleConfig, ['external', 'require']);
	 }
	
	 var b = browserify(bundleConfig);
	 b.transform(hbsfy);
	
	 var bundle = function() {
	   // Log when bundling starts
	   bundleLogger.start(bundleConfig.outputName);
	
	   return b
	     .bundle()
	     // Report compile errors
	     //.on('error', handleErrors)
	     // Use vinyl-source-stream to make the
	     // stream gulp compatible. Specify the
	     // desired output filename here.
	     .pipe(source(bundleConfig.outputName))
	     // Specify the output destination
	     .pipe(gulp.dest(bundleConfig.dest))
	     .pipe(browserSync.reload({
	       stream: true
	     }));
	 };
	
	 if(devMode) {
	   // Wrap with watchify and rebundle on changes
	   b = watchify(b);
	   // Rebundle on update
	   b.on('update', bundle);
	   bundleLogger.watch(bundleConfig.outputName);
	 } else {
	   // Sort out shared dependencies.
	   // b.require exposes modules externally
	   if(bundleConfig.require) b.require(bundleConfig.require);
	   // b.external excludes modules from the bundle, and expects
	   // they'll be available externally
	   if(bundleConfig.external) b.external(bundleConfig.external);
	 }
	
	 return bundle();
	};
	
	// Start bundling with Browserify for each bundleConfig specified
	return mergeStream.apply(gulp, _.map(config.bundleConfigs, browserifyThis));
};

gulp.task('browserify', function() {
	return browserifyTask()
});

//Exporting the task so we can call it directly in our watch task, with the 'devMode' option
//module.exports = browserifyTask;

gulp.task('watchify', function() {
	// Start browserify task with devMode === true
	return browserifyTask(true);
});

gulp.task('test-all', ['lint', 'scss', 'browserify', 'test']);
