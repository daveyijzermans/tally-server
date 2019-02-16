const gulp = require('gulp'),
      argv = require('yargs').argv,

      // Scripts
      webpack = require('webpack'),
      webpackGulp = require('webpack-stream'),
      babel = require('gulp-babel'),
      rigger = require('gulp-rigger'),
      plumber = require('gulp-plumber'),
      notifier = require('node-notifier'),
      sourcemaps = require('gulp-sourcemaps'),
      browserSync = require("browser-sync"),

      // Styles
      sass = require('gulp-sass'),
      postcss = require('gulp-postcss'),
      autoprefixer = require('autoprefixer'),
      cssnano = require('cssnano'),
      customProperties = require('postcss-custom-properties'),
      flexboxFix = require('postcss-flexbugs-fixes'),

      // Server
      Monitor = require('forever-monitor').Monitor,
      forever = new Monitor('dist/index.js')
        .on('restart', (child) => console.error('Forever restarting script for ' + child.times + ' time'))
        .on('exit:code', (code) => console.error('Forever detected script exited with code ' + code));

/**
 * Paths to source files
 * @type {Object}
 */
let resources = {
  scss: ['resources/scss/**/*.scss'],
  js: ['resources/js/**/*.*'],
  fonts: ['resources/fonts/**/*.*', 'node_modules/@fortawesome/fontawesome-free/webfonts/*.*'],
  images: ['resources/images/**/*.*'],
  html: ['resources/html/*.*'],
  htmlIncludes: ['resources/html/includes/*.html'],
  client: ['resources/client/**/*.*'],
  server: ['src/**/*.*']
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
        .pipe(gulp.dest('dist/www/assets/css'))
        .pipe(browserSync.reload({stream: true}));
    };

  return gulp.src(resources.scss)
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss(plugins))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist/www/assets/css'))
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
    .pipe(gulp.dest('dist/www/assets/js'))
    .pipe(browserSync.reload({stream: true}));
};

/*
* Fonts task
*
* Description: just moving to /dist/www folder.
*/
let fonts = () =>
{
  return gulp.src(resources.fonts)
    .pipe(gulp.dest('dist/www/assets/fonts'))
    .pipe(browserSync.reload({stream: true}));
};

/*
* Images task
*
* Description: just moving to /dist/www folder.
*/
let images = () =>
{
  return gulp.src(resources.images)
    .pipe(gulp.dest('dist/www/assets/images'))
    .pipe(browserSync.reload({stream: true}));
};

/*
* Client task
*
* Description: just moving to /dist/www folder.
*/
let client = () =>
{
  return gulp.src(resources.client)
    .pipe(gulp.dest('dist/www/client'));
};

/*
* Move HTML files 
*/
let html = () =>
{
  return gulp.src(resources.html)
    .pipe(rigger())
    .pipe(gulp.dest('dist/www'))
    .pipe(browserSync.reload({stream: true}));
};

/**
 * Browser sync task
 */
let browser = () =>
{
  browserSync.init(null, {
    proxy: "http://localhost",
        files: ["dist/www/**/*.*"],
        port: 3000,
  });
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
  gulp.watch(resources.htmlIncludes, html);
  gulp.watch(resources.server, gulp.series(server, restart));
};

/*
* Server build task
*/
let server = done =>
{
  return gulp.src(resources.server)
    .pipe(babel())
    .pipe(gulp.dest('dist'));
};

/**
 * Start server task
 */
let start = done =>
{
  forever.start();
  done();
};

/**
 * Restart server task
 */
let restart = done =>
{
  forever.restart();
  done();
};

/**
 * Build all
 */
let build = gulp.series(gulp.parallel(scss, js, fonts, images, html, client), server);

/*
* Start server task
*/
exports.build = build;
exports.dev = gulp.series(build, gulp.parallel(start, browser, watch));
exports.default = gulp.series(build, start);
