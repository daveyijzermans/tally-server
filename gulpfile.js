const webpack = require('webpack'),
      webpackGulp = require('webpack-stream'),
      gulp = require('gulp'),
      browserSync = require("browser-sync"),
      rigger = require('gulp-rigger'),
      consolidate = require('gulp-consolidate'),
      plumber = require('gulp-plumber'),
      notifier = require('node-notifier'),
      argv = require('yargs').argv,
      sourcemaps = require('gulp-sourcemaps'),

      // Styles
      sass = require('gulp-sass'),
      postcss = require('gulp-postcss'),
      autoprefixer = require('autoprefixer'),
      cssnano = require('cssnano'),
      customProperties = require('postcss-custom-properties'),
      flexboxFix = require('postcss-flexbugs-fixes');

const browsersyncConfig = {
        server: {
            baseDir: './www',
            index: 'index.html'
        },
        tunnel: true,
        host: 'localhost',
        port: 80,
        // logLevel: 'silent'
    };

/**
 * Paths to source files
 * @type {Object}
 */
let resources = {
  scss: ['resources/scss/**/*.scss'],
  js: [
    'resources/vendor/jquery/dist/jquery.js',
    'resources/vendor/jquery-md5/jquery.md5.js',
    'resources/vendor/bootstrap/dist/js/bootstrap.bundle.js',
    'resources/js/**/*.*'
  ],
  fonts: ['resources/fonts/**/*.*', 'node_modules/@fortawesome/fontawesome-free/webfonts/*.*'],
  images: ['resources/images/**/*.*'],
  html: ['resources/index.html'],
  client: ['resources/client/**/*.*']
};

/**
 * Webpack log settings
 * @type {Object}
 */
let webpackStatsConfig = {
    colors: true, hash: true, version: true, timings: true, assets: true, chunks: true,
    chunkModules: false, modules: false, children: false, cached: false, reasons: false,
    source: false, errorDetails: true, chunkOrigins: false
};

/*
* Styles task
*
* Description: compile SASS and using PostCSS plugins
*/
gulp.task('build:scss', function(){
  let plugins = [
        autoprefixer({browsers: ['last 8 versions'], cascade: false}),
    customProperties({
      preserve: false
    }),
    flexboxFix()
    ];

    if (argv.prod) {
      plugins.push(cssnano());

      return gulp.src(resources.scss)
        .pipe(sass().on('error', sass.logError))
        .pipe(postcss(plugins))
        .pipe(gulp.dest('www/assets/css'))
        .pipe(browserSync.reload({stream: true}));
    }

  return gulp.src(resources.scss)
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss(plugins))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('www/assets/css'))
    .pipe(browserSync.reload({stream: true}));
});

/*
* JS task
*
* Description: making JS bundle
*/
gulp.task('build:js', function(done){
  return gulp.src('resources/js/index.js')
    .pipe(plumber({
      errorHandler: function(error){
        notifier.notify({
          title: 'Gulp',
          message: '❌ Build failed!'
        });
      }
    }))
    .pipe(webpackGulp(require(argv.prod ? './webpack.prod.js' : './webpack.dev.js'), webpack, function(err, stats) {
      if (err) {
        notifier.notify({
          title: 'Webpack',
          message: '❌ Build failed!'
        });
        console.log(err);
      }
      console.log(stats.toString(webpackStatsConfig));
    }))
    .pipe(gulp.dest('www/assets/js'))
    .pipe(browserSync.reload({stream: true}));
});

/*
* Fonts task
*
* Description: just moving to /www folder.
*/
gulp.task('build:fonts', function(){
  return gulp.src(resources.fonts)
    .pipe(gulp.dest('www/assets/fonts'))
    .pipe(browserSync.reload({stream: true}));
});

/*
* Images task
*
* Description: just moving to /www folder.
*/
gulp.task('build:images', function(){
  return gulp.src(resources.images)
    .pipe(gulp.dest('www/assets/images'))
    .pipe(browserSync.reload({stream: true}));
});

/*
* Client task
*
* Description: just moving to /www folder.
*/
gulp.task('build:client', function(){
  return gulp.src(resources.client)
    .pipe(gulp.dest('www/client'));
});

/*
* Build HTML templates 
*/
gulp.task('build:html', function(){
  return gulp.src(resources.html)
    .pipe(rigger())
    .pipe(gulp.dest('www'))
    .pipe(browserSync.reload({stream: true}));
});

/*
* Watch task
*/
gulp.task('watch',function(){
  gulp.watch(resources.fonts, ['build:fonts']);
  gulp.watch(resources.scss, ['build:scss']);
  gulp.watch(resources.js, ['build:js']);
  gulp.watch(resources.images, ['build:images']);
  gulp.watch(resources.html, ['build:html']);
  gulp.watch(resources.client, ['build:client']);
});

/*
* Main build task
*/
gulp.task('build', [
  'build:scss',
  'build:js',
  'build:fonts',
  'build:images',
  'build:html',
  'build:client'
]);

/*
* Start server task
*/
gulp.task('server', function () {
    gulp.run('build');
    //start server
});

gulp.task('default', [
  'server',
  'watch'
]);
