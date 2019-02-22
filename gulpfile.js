const gulp = require('gulp'),
      argv = require('yargs').argv,
      jsdoc = require('gulp-jsdoc3')

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
const resources = {
  scss: ['admin/scss/**/*.scss'],
  js: ['admin/js/**/*.*'],
  fonts: ['admin/fonts/**/*.*', 'node_modules/@fortawesome/fontawesome-free/webfonts/*.*'],
  images: ['admin/images/**/*.*'],
  html: ['admin/html/*.*'],
  htmlIncludes: ['admin/html/includes/*.html'],
  client: ['client/config.json', 'client/package.client.json', 'client/update.sh'],
  server: ['server/**/*.*'],
  docs: ['README.md', 'client/*.js', 'admin/js/**/*.js', 'server/**/*.js']
};

/**
 * Webpack log settings
 * @type {Object}
 */
const webpackStatsConfig = {
    colors: true, hash: true, version: true, timings: true, assets: true, chunks: true,
    chunkModules: false, modules: false, children: false, cached: false, reasons: false,
    source: false, errorDetails: true, chunkOrigins: false
};

/*
* Styles task
*
* Description: compile SASS and using PostCSS plugins
*/
const scss = () =>
{
  const plugins = [
    autoprefixer({browsers: ['last 8 versions'], cascade: false}),
    customProperties({
      preserve: false
    }),
    flexboxFix()
  ];

  if(argv.prod)
  {
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
const js = done =>
{
  return gulp.src('admin/js/index.js')
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
const fonts = () =>
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
const images = () =>
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
const client = () =>
{
  return gulp.src(resources.client)
    .pipe(gulp.dest('dist/www/client'));
};

/*
* Move HTML files 
*/
const html = () =>
{
  return gulp.src(resources.html)
    .pipe(rigger())
    .pipe(gulp.dest('dist/www'))
    .pipe(browserSync.reload({stream: true}));
};

/**
 * Browser sync task
 */
const browser = () =>
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
const watch = () =>
{
  gulp.watch(resources.fonts, fonts);
  gulp.watch(resources.scss, scss);
  gulp.watch(resources.js, js);
  gulp.watch(resources.images, images);
  gulp.watch(resources.html, html);
  gulp.watch(resources.client, client);
  gulp.watch(resources.htmlIncludes, html);
  gulp.watch(resources.server, gulp.series(buildServer, restart));
  gulp.watch('client/index.js', buildClient);
  gulp.watch(resources.docs, docs);
};

/*
* Watch docs task
*/
const watchDocs = () =>
{
  gulp.watch(resources.docs, docs);
};

/*
* Server build task
*/
const buildServer = done =>
{
  if(argv.prod)
  {
    return gulp.src(resources.server)
      .pipe(babel())
      .pipe(gulp.dest('dist'));
  }
  return gulp.src(resources.server)
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist'));
};

/*
* Client build task
*/
const buildClient = done =>
{
  return gulp.src('client/index.js')
    .pipe(babel())
    .pipe(gulp.dest('dist/www/client'));
};

/**
 * Start server task
 */
const start = done =>
{
  forever.start();
  done();
};

/**
 * Restart server task
 */
const restart = done =>
{
  forever.restart();
  done();
};

process.once('SIGINT', () =>
{
  forever.stop();
});

const docs = done =>
{
  return gulp.src(resources.docs, {read: false})
    .pipe(jsdoc(require('./jsdoc.json')));
}

/**
 * Build all
 */
const build = gulp.series(gulp.parallel(scss, js, fonts, images, html, client), buildClient, buildServer);

/*
* Start server task
*/
exports.build = build;
exports.docs = docs;
exports.watch = watch;
exports.dev = gulp.series(build, gulp.parallel(start, browser, watch));
exports.default = start;
