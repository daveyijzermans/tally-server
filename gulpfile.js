const gulp = require('gulp'),
	    plumber = require('gulp-plumber'),
	    sourcemaps = require('gulp-sourcemaps'),

	    // JS
    	concat = require('gulp-concat'),
    	rename = require('gulp-rename'),
    	terser = require('gulp-terser'),

    	// Styles
    	sass = require('gulp-sass'),
    	postcss = require('gulp-postcss'),
    	autoprefixer = require('autoprefixer'),
    	cssnano = require('cssnano'),
    	customProperties = require('postcss-custom-properties'),
    	flexboxFix = require('postcss-flexbugs-fixes');

/**
 * Paths to source files
 * @type {Object}
 */
var resources = {
	scss: ['resources/scss/**/*.scss'],
	js: [
	  'resources/vendor/jquery/dist/jquery.js',
	  'resources/vendor/jquery-md5/jquery.md5.js',
	  'resources/vendor/bootstrap/dist/js/bootstrap.bundle.js',
	  'resources/js/**/*.*'
  ],
	fonts: ['resources/fonts/**/*.*', 'resources/vendor/fontawesome/webfonts/*.*']
};

/*
* Styles task
*
* Description: compile SASS and using PostCSS plugins
*/
gulp.task('build:scss', () =>
{
	let plugins = [
    autoprefixer({browsers: ['last 8 versions'], cascade: false}),
		customProperties({
			preserve: false
		}),
		flexboxFix(),
    cssnano()
  ];

	return gulp.src(resources.scss)
		.pipe(sourcemaps.init())
		.pipe(sass().on('error', sass.logError))
		.pipe(postcss(plugins))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('www/assets/css'));
});

/*
* JS task
*
* Description: making JS bundle
*/
gulp.task('build:js', (done) =>
{
	return gulp.src(resources.js)
				.pipe(sourcemaps.init())
        .pipe(concat('index.js'))
        .pipe(gulp.dest('www/assets/js'))
        .pipe(rename('index.min.js'))
        .pipe(terser())
				.pipe(sourcemaps.write())
        .pipe(gulp.dest('www/assets/js'));
});

/*
* Fonts task
*
* Description: just moving to /public folder.
*/
gulp.task('build:fonts', () =>
{
	return gulp.src(resources.fonts)
		.pipe(gulp.dest('www/assets/fonts'));
});

/*
* Main build task
*/
gulp.task('build', [
	'build:fonts',
	'build:scss',
	'build:js'
]);

gulp.task('default', [
	'build'
]);
