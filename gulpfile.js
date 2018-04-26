// core
var fs = require('fs');
var pack = JSON.parse(fs.readFileSync('./package.json'));

var
  gulp = require('gulp'),
  browserify = require('gulp-browserify'),
  babel = require('gulp-babel'),
  rename = require('gulp-rename'),
  uglify = require('gulp-uglify'),
  minify = require('gulp-minify'),
  pump = require('pump'),
  runSequence = require('run-sequence'),
  del = require('del'),
  merge = require('merge2');
// typescript
var
  ts = require("gulp-typescript"),
  tsProject = ts.createProject("tsconfig.json");
// styles 
var
  sassImport = require('gulp-sass-import'),
  sass = require('gulp-sass'),
  rename = require('gulp-rename'),
  sourcemaps = require('gulp-sourcemaps'),
  cleanCSS = require('gulp-clean-css');
// browserSync
var browserSync = require('browser-sync').create();
// Static server
gulp.task('browse-sync', () => {
  browserSync.init({
    server: {
      baseDir: "./"
    }
  });
});

gulp.task('clean', () => {
  return del([
    '@types/**/*',
    'dist/**/*',
    'lib/**/*',
    '!dist/do-not-delete-this.json'
  ]);
});

gulp.task('dist', () => {
  runSequence('clean', ['typescript', 'sass'], ['lib_css', 'lib_js'], () => {
    console.log("well, it's done");
  });
});

gulp.task('default', ["dist"], () => {

  gulp.watch('src/**/*.scss', ['sass']);
  gulp.watch('src/**/*.ts', ['typescript']);

  gulp.watch('lib/main.css', ['lib_css']);
  gulp.watch('lib/**/*.js', ['lib_js']);

  gulp.watch(["**/*.html", "dist/*.js"]).on('change', browserSync.reload);
});
// src => lib
gulp.task('sass', () => {
  return gulp
    .src(['./src/**/*.scss', './src/**/*.css'])
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./lib'));
});

gulp.task("typescript", () => {
  // const tsResult = tsProject.src(["src/**/*.ts", "src/**/*.tsx"])
  //     .pipe(sourcemaps.init())
  //     .pipe(tsProject());
  const tsResult = tsProject.src()
    .pipe(sourcemaps.init())
    .pipe(tsProject());
  return merge([
    tsResult.js.pipe(sourcemaps.write()).pipe(gulp.dest("./lib")),
    tsResult.dts.pipe(gulp.dest("./@types"))]
  );
});
// lib => dist
gulp.task('lib_css', () => {
  return gulp.src('./lib/main.css')
    .pipe(cleanCSS({
      format: 'beautify',
      compatibility: 'ie9'
    }))
    .pipe(rename(pack.name + ".css"))
    .pipe(gulp.dest('dist'))
    .pipe(cleanCSS({
      compatibility: 'ie9'
    }))
    .pipe(rename(pack.name + ".min.css"))
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.stream());
});

gulp.task('lib_js', () => {
  var options = {
    ext: {
      min: ".min.js",
      ignoreFiles: ['.combo.js', '.min.js']
    }
  };
  return gulp.src('lib/main.js')
    .pipe(browserify({
      insertGlobals: false,
      sourceMapsAbsolute: true,
      presets: ["@babel/preset-env", "@babel/preset-react"]
    }))
    .pipe(rename(pack.name + ".js"))
    .pipe(gulp.dest('./dist'))
    .pipe(minify(options))
    .pipe(gulp.dest('./dist'))
});
