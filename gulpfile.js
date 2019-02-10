const webpack = require('webpack'),
      webpackGulp = require('webpack-stream'),
      gulp = require('gulp'),
      browserSync = require("browser-sync"),
      rigger = require('gulp-rigger'),
      plumber = require('gulp-plumber'),
      notifier = require('node-notifier'),
      argv = require('yargs').argv,
      sourcemaps = require('gulp-sourcemaps'),
      Forever = require('forever-monitor').Monitor

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
  html: ['resources/html/**/*.*'],
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
let scss = () =>
{
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
    };

  return gulp.src(resources.scss)
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss(plugins))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('www/assets/css'))
    .pipe(browserSync.reload({stream: true}));
};

/*
* JS task
*
* Description: making JS bundle
*/
let js = done =>
{
  return gulp.src('resources/js/index.js')
    .pipe(plumber({
      errorHandler: error =>
      {
        notifier.notify({
          title: 'Gulp',
          message: '❌ Build failed!'
        });
      }
    }))
    .pipe(webpackGulp(require(argv.prod ? './webpack.prod.js' : './webpack.dev.js'), webpack, (err, stats) =>
    {
      if (err)
      {
        notifier.notify({
          title: 'Webpack',
          message: '❌ Build failed!'
        });
        console.log(err);
      };
      console.log(stats.toString(webpackStatsConfig));
    }))
    .pipe(gulp.dest('www/assets/js'))
    .pipe(browserSync.reload({stream: true}));
};

/*
* Fonts task
*
* Description: just moving to /www folder.
*/
let fonts = () =>
{
  return gulp.src(resources.fonts)
    .pipe(gulp.dest('www/assets/fonts'))
    .pipe(browserSync.reload({stream: true}));
};

/*
* Images task
*
* Description: just moving to /www folder.
*/
let images = () =>
{
  return gulp.src(resources.images)
    .pipe(gulp.dest('www/assets/images'))
    .pipe(browserSync.reload({stream: true}));
};

/*
* Client task
*
* Description: just moving to /www folder.
*/
let client = () =>
{
  return gulp.src(resources.client)
    .pipe(gulp.dest('www/client'));
};

/*
* Move HTML files 
*/
let html = () =>
{
  return gulp.src(resources.html)
    .pipe(rigger())
    .pipe(gulp.dest('www'))
    .pipe(browserSync.reload({stream: true}));
};

/*
* Watch task
*/
let watch = () =>
{
  gulp.watch(resources.fonts, fonts);
  gulp.watch(resources.scss, scss);
  gulp.watch(resources.js, js);
  gulp.watch(resources.images, images);
  gulp.watch(resources.html, html);
  gulp.watch(resources.client, client);
};

/**
 * Start app server task
 */
let forever = cb =>
{
  let child = new Forever('index.js').on('restart', () =>
  {
      console.error('Forever restarting script for ' + child.times + ' time');
  }).on('exit:code', (code) =>
  {
      console.error('Forever detected script exited with code ' + code);
  }).start();
};

/**
 * Browser sync task
 */
let browser = () =>
{
  browserSync.init(null, {
    proxy: "http://localhost",
        files: ["www/**/*.*"],
        port: 3000,
  });
};

/*
* Start server task
*/
exports.build = gulp.parallel(scss, js, fonts, images, html, client);
exports.dev = gulp.series(gulp.parallel(scss, js, fonts, images, html, client), gulp.parallel(forever, browser, watch));
exports.default = forever;
