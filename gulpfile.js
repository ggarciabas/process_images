/**
 * @file gulpfile.js
 *
 * Build tasks and generator tools for www.tsmithphotos.com
 * By Taylor Smith @tsmith512 - www.tsmithcreative.com 2016.
 *
 * Run `gulp help` to for a list of suggested tasks.
 */

/* eslint strict: ["error", "global"] */
/* global require */
'use strict';

/*
     _
  __| | ___ _ __  ___
 / _` |/ _ \ '_ \/ __|
| (_| |  __/ |_) \__ \
 \__,_|\___| .__/|___/
           |_|
*/

const gulp = require('gulp-help')(require('gulp'), {
  description: false,
  hideDepsMessage: true,
  hideEmpty: true
});
const gutil = require('gulp-util');

const autoprefixer = require('gulp-autoprefixer');
const cleanCSS = require('gulp-clean-css');
const concat = require('gulp-concat');
const eslint = require('gulp-eslint');
const exec = require('child_process').exec;
const exif = require('exif-parser');
const fs = require('fs');
const glob = require('glob');
const gulpicon = require('gulpicon/tasks/gulpicon');
const gulpiconConfig = require('./_icons/config.js');
const gulpiconFiles = glob.sync('./_icons/*.svg');
const imagemin = require('gulp-imagemin');
const imgsize = require('image-size');
const merge = require('deepmerge');
const mergeStream = require('merge-stream');
const recursiveReadSync = require('recursive-readdir-sync');
const resize = require('gulp-image-resize');
const rename = require('gulp-rename');
const runSequence = require('run-sequence');
const sass = require('gulp-sass');
const uglify = require('gulp-uglify');
const yaml = require('js-yaml');
const jo = require('jpeg-autorotate')
// var rm = require( 'gulp-rm' );
// var del = require('del');

gulp.task('clean', 'Clean files', () => {
  exec('rm -f source/index.yml', (err, stdout, stderr) => {
    gutil.log(stdout);
    gutil.log(stderr);
  });
  exec('rm -f _data/index.yml', (err, stdout, stderr) => {
    gutil.log(stdout);
    gutil.log(stderr);
  });
});

// muito importante!
gulp.task('yml-link', 'Create link yml to data', () => {
  exec('rm -f _data/index.yml', (err, stdout, stderr) => {
    gutil.log(stdout);
    gutil.log(stderr);
  });
  exec('ln source/master_index.yml _data/index.yml', (err, stdout, stderr) => {
    gutil.log(stdout);
    gutil.log(stderr);
  });
});

gulp.task('remove-ds-store', 'Remove DS_Store', () => {
  exec('find . -type f -name \'.DS_Store\' -delete', (err, stdout, stderr) => {
    gutil.log(stdout);
    gutil.log(stderr);
  });
});

// gulp.task('update-ggarciabas', 'Copy to ggarciabas.github.io', () => {
//   exec('cp -fR * ../ggarciabas.github.io/', (err, stdout, stderr) => {
//     gutil.log(stdout);
//     gutil.log(stderr);
//   });
// });

gulp.task('copy-mh', 'Copy main_head', () => {
  exec('cp -f main_head.jpg photo/', (err, stdout, stderr) => {
    gutil.log(stdout);
    gutil.log(stderr);
  });
});

/* --- https://github.com/google/skicka para sincronizar com GoogleDrive*/
gulp.task('fetch-source', 'Download original photos from GoogleDrive', (cb) => {
  exec('skicka download /Fotos/PhotoBlog ./source/Photography/', {maxBuffer: 10000 * 1024}, (err, stdout, stderr) => {
    gutil.log(stdout);
    gutil.log(stderr);
    cb(err);
  });
});

gulp.task('upload', 'Upload original photos from GoogleDrive', (cb) => {
  exec('skicka upload ./source/Photography /Fotos/PhotoBlog', {maxBuffer: 10000 * 1024}, (err, stdout, stderr) => {
    gutil.log(stdout);
    gutil.log(stderr);
    cb(err);
  });
});

/*
       _           _
 _ __ | |__   ___ | |_ ___  ___
| '_ \| '_ \ / _ \| __/ _ \/ __|
| |_) | | | | (_) | || (_) \__ \
| .__/|_| |_|\___/ \__\___/|___/
|_|
*/

// Containers for image data processing which is kicked off by gulp
// but aren't actually gulp tasks. Adapted from http://stackoverflow.com/a/18934385
// We don't need a recursive function since we know the structure.
// Create object: {
//   'album name' : {
//     'title': (directory name without the date)
//     'date': (directory name without the name)
//     'contents': [ (an array of photo objects, to be sorted by date)
//       {
//         properties pulled from EXIF data and image size
//       }
//     ]
// }
const walkPhotos = (path) => {
  const directory = fs.readdirSync(path);

  // Directory is going to be an array of album directories
  for (var i = 0; i < directory.length; i++) {
    // This is the directory name from Lightroom ('2015-12-31 New Years Eve' style)
    const album = directory[i];

    // The root of the Photography directory has a placeholder to keep this
    // directory in-repo so we don't get errors on an initial clone/download.
    // Skip it.
    if (album === '.gitkeep') {
      continue;
    }

    // This is the directory shortname Gulp is using for image output.
    const dirname = album.replace(/[a-z]/g, '').replace(/ /, '-').replace(/\s/g, '');
    const index = {};

    // This will be the image contents and any subdirectories
    const photos = recursiveReadSync(path + '/' + album);
    const contains = [];

    for (var j = 0; j < photos.length; j++) {
      // recursiveReadSync returns the path relative to the CWD, not just the name
      // like fs.readdirSync so this will be /source/Proccess/.../whatever.img
      const photo = photos[j];

      // So split on / and take the last component for the filename.
      const file = photo.split('/').pop();

      // Original images are sometimes in subdirectories by day or activity, which
      // is why we recused the whole thing. Don't try to get stats on a directory,
      // just skip it.
      if (fs.statSync(photo).isDirectory()) { continue; }

      const dimensions = imgsize(photo);

      const photoBuffer = fs.readFileSync(photo);
      const exifParser = exif.create(photoBuffer);
      const exifResult = exifParser.parse();

      if (exifResult.tags.Make) {
        if (file === 'main.jpg') {
          contains.push({
            filename: file,
            width: dimensions.width || null,
            height: dimensions.height || null,
            // The D7000 writes 'NIKON CORPORATION / NIKON D7000' across these fields.
            // The X-E1 writes 'FUJIFILM / XE-1'. So we do this stupid thing to normalize
            // as 'Make Model' which is what they should be in the first place...
            camera: [(exifResult.tags.Make.split(' ') || null)[0], (exifResult.tags.Model.split(' ').pop()) || null].join(' '),
            lens: exifResult.tags.LensModel || null,
            focal: exifResult.tags.FocalLength || null,
            aperture: exifResult.tags.FNumber || null,
            // EXIF shutter speed is written in decimal seconds, which isn't how that is
            // actually written. For times over 1 second, write as is with an "s" to signify
            // full seconds. Otherwise, turn it into a fraction 1/x which is what people
            // will be used to seeing. Yay math.
            shutter: (exifResult.tags.ExposureTime > 1 ? (exifResult.tags.ExposureTime + 's') : ('1/' + (1 / exifResult.tags.ExposureTime))) || null,
            iso: exifResult.tags.ISO || null,
            date: exifResult.tags.DateTimeOriginal || null,
            hero: 1
          });
        }
        else {
          contains.push({
            filename: file,
            width: dimensions.width || null,
            height: dimensions.height || null,
            // The D7000 writes 'NIKON CORPORATION / NIKON D7000' across these fields.
            // The X-E1 writes 'FUJIFILM / XE-1'. So we do this stupid thing to normalize
            // as 'Make Model' which is what they should be in the first place...
            camera: [(exifResult.tags.Make.split(' ') || null)[0], (exifResult.tags.Model.split(' ').pop()) || null].join(' '),
            lens: exifResult.tags.LensModel || null,
            focal: exifResult.tags.FocalLength || null,
            aperture: exifResult.tags.FNumber || null,
            // EXIF shutter speed is written in decimal seconds, which isn't how that is
            // actually written. For times over 1 second, write as is with an "s" to signify
            // full seconds. Otherwise, turn it into a fraction 1/x which is what people
            // will be used to seeing. Yay math.
            shutter: (exifResult.tags.ExposureTime > 1 ? (exifResult.tags.ExposureTime + 's') : ('1/' + (1 / exifResult.tags.ExposureTime))) || null,
            iso: exifResult.tags.ISO || null,
            date: exifResult.tags.DateTimeOriginal || null
          });
        }
      }
      else {
        if (file === 'main.jpg') {
          contains.push({
            filename: file,
            width: dimensions.width || null,
            height: dimensions.height || null,
            lens: exifResult.tags.LensModel || null,
            focal: exifResult.tags.FocalLength || null,
            aperture: exifResult.tags.FNumber || null,
            // EXIF shutter speed is written in decimal seconds, which isn't how that is
            // actually written. For times over 1 second, write as is with an "s" to signify
            // full seconds. Otherwise, turn it into a fraction 1/x which is what people
            // will be used to seeing. Yay math.
            shutter: (exifResult.tags.ExposureTime > 1 ? (exifResult.tags.ExposureTime + 's') : ('1/' + (1 / exifResult.tags.ExposureTime))) || null,
            iso: exifResult.tags.ISO || null,
            date: exifResult.tags.DateTimeOriginal || null,
            hero: 1
          });
        }
        else {
          contains.push({
            filename: file,
            width: dimensions.width || null,
            height: dimensions.height || null,
            lens: exifResult.tags.LensModel || null,
            focal: exifResult.tags.FocalLength || null,
            aperture: exifResult.tags.FNumber || null,
            // EXIF shutter speed is written in decimal seconds, which isn't how that is
            // actually written. For times over 1 second, write as is with an "s" to signify
            // full seconds. Otherwise, turn it into a fraction 1/x which is what people
            // will be used to seeing. Yay math.
            shutter: (exifResult.tags.ExposureTime > 1 ? (exifResult.tags.ExposureTime + 's') : ('1/' + (1 / exifResult.tags.ExposureTime))) || null,
            iso: exifResult.tags.ISO || null,
            date: exifResult.tags.DateTimeOriginal || null
          });
        }
      }
    }

    index[dirname] = {
      title: album.replace(/.+? /, ''),
      date: album.split(/ /, 1)[0],
      contents: contains
    };

    fs.writeFileSync('_data/'+dirname+'.yml', yaml.safeDump(index));
  }
};

gulp.task('index', 'Scan for new and deleted photos and albums, merge with the index', () => {
  walkPhotos('./source/new');
});

gulp.task('prime-posts', 'Create stub post files for any albums that don\'t have them already', () => {
  let index = {};
  try {
    index = fs.readFileSync('source/master_index.yml', {encoding: 'utf8'});
    index = yaml.safeLoad(index);
  }
  catch (e) {
    throw e;
  }

  for (var album in index) {
    if (!index.hasOwnProperty(album)) { continue; }

    const postFile = '_posts/' + album + '.markdown';
    const postContent = ['---', ('title: ' + index[album].title), 'locationtext:', ('masthead: /photo/large/' + album + '/main.jpg'), 'photoswipe: 1', '---', ('> ' + index[album].title), ''].join('\n');
    try {
      fs.writeFileSync(postFile, postContent, {flag: 'wx'});
    }
    catch (e) {
      // This will fail EEXIST if the file already exists, which is fine so
      // "fail" silently in that case because it means I already wrote the
      // post. Throw any actual errors though.
      if (e.code !== 'EEXIST') {
        throw e;
      }
      else {
        continue;
      }
    }

    // We created a post (if it already existed, the `continue` would have fired)
    gutil.log('Created new Jekyll post file for ' + album);
  }
});

gulp.task('photos', 'Rebuild all image derivatives: large, medium, thumb, mini. WARNING: ~30 minutes', () => {
  return gulp.src('./source/new/**/*.jpg')
    .pipe(rename((path) => {
      // Sometimes I use subdirectories within albums to denote days, squash em
      // @TODO: Technically this could lead to collisions, but it is unlikely because the
      // cameras both don't cycle until 9999 so only if 10,000 were taken in a day.
      path.dirname = path.dirname.split('/')[0];

      // Now, for shorter and more URL friendly paths, drop spaces and lowercase letters
      // so '2016-03-21 Tulsa Weekend for Roadtrip Video with Fuji XE1' becomes
      // '2016-03-21-TWRVFXE1'. Keeping capital letters and numbers helps with collisions.
      path.dirname = path.dirname.replace(/[a-z]/g, '').replace(/ /, '-').replace(/\s/g, '');
    }))
    .pipe(resize({width: 1920, height: 1080, crop: false, upscale: false}))
    .pipe(imagemin([imagemin.jpegtran({progressive: true})]))
    .pipe(gulp.dest('photo/large/'))
    .pipe(resize({width: 600, height: 600, crop: false, upscale: false}))
    .pipe(imagemin([imagemin.jpegtran({progressive: true})]))
    .pipe(gulp.dest('photo/medium/'))
    .pipe(resize({width: 200, height: 200, crop: true, upscale: false}))
    .pipe(imagemin([imagemin.jpegtran({progressive: true})]))
    .pipe(gulp.dest('photo/thumb/'));
});

/*
                    _
  __ _ ___ ___  ___| |_ ___
 / _` / __/ __|/ _ \ __/ __|
| (_| \__ \__ \  __/ |_\__ \
 \__,_|___/___/\___|\__|___/

*/

gulp.task('sass', 'Compile Sass to CSS', () => {
  return gulp.src('./_sass/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 2 versions'],
      cascade: false
    }))
    // Run CleanCSS, but mostly just for minification. Starting light here.
    .pipe(cleanCSS({
      advanced: false,
      mediaMerging: false,
      rebase: false,
      restructuring: false,
      shorthandCompacting: false
    }))
    .pipe(gulp.dest('./assets/css'));
});

gulp.task('js-photoswipe', false, () => {
  return gulp.src(['./node_modules/photoswipe/dist/*.js', '_js/photoswipe.tsp.js'])
    .pipe(concat('photoswipe.all.js'))
    .pipe(uglify({mangle: false}))
    .pipe(gulp.dest('./assets/js'));
});

gulp.task('js-photoswipe-assets', false, () => {
  return gulp.src(['./node_modules/photoswipe/dist/default-skin/*.png', './node_modules/photoswipe/dist/default-skin/*.svg', './node_modules/photoswipe/dist/default-skin/*.gif'])
    .pipe(gulp.dest('./assets/css'));
});

gulp.task('js-all', false, () => {
  return gulp.src([
    './_js/lazyload.js',
    './node_modules/fg-loadcss/src/loadCSS.js',
    './node_modules/fg-loadcss/src/cssrelpreload.js'
  ])
    .pipe(concat('all.js'))
    .pipe(uglify({mangle: false}))
    .pipe(gulp.dest('./assets/js'));
});

gulp.task('lint', 'Lint all non-vendor JS', () => {
  return gulp.src(['gulpfile.js', '_js/**/*.js', '!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('js', 'JS/Photoswipe aggregation/minify, custom JS linting', () => {
  runSequence('js-photoswipe', 'js-photoswipe-assets', 'js-all');
});

gulp.task('icons', false, gulpicon(gulpiconFiles, gulpiconConfig));

gulp.task('favicons', 'Copy favicons into position', () => {
  return gulp.src(['./_favicon/*.*'])
  .pipe(gulp.dest('./assets/'));
});

gulp.task('graphics', 'Compress site graphics and aggregate icons', () => {
  runSequence('icons', 'favicons');
  return gulp.src('./_gfx/**/*.*')
    .pipe(imagemin())
    .pipe(gulp.dest('./assets/gfx/'));
});

/*
     _ _         _           _ _     _
 ___(_) |_ ___  | |__  _   _(_) | __| |
/ __| | __/ _ \ | '_ \| | | | | |/ _` |
\__ \ | ||  __/ | |_) | |_| | | | (_| |
|___/_|\__\___| |_.__/ \__,_|_|_|\__,_|

*/

gulp.task('jekyll', 'Run jekyll build', (cb) => {
  const spawn = require('child_process').spawn;
  const jekyll = spawn('jekyll', ['build'], {stdio: 'inherit'});
  jekyll.on('exit', (code) => {
    cb(code === 0 ? null : 'ERROR: Jekyll process exited with code: ' + code);
  });
});

gulp.task('htaccess', 'Update/install .htaccess files', () => {
  const root = gulp.src('./_htaccess/root').pipe(rename('.htaccess')).pipe(gulp.dest('./assets/'));
  const photo = gulp.src('./_htaccess/photo').pipe(rename('.htaccess')).pipe(gulp.dest('./assets/photo/'));

  return mergeStream(root, photo);
});


gulp.task('update', 'Add/remove photos and albums: index, photos, prime-posts, and jekyll. WARNING: ~30 minutes.', (cb) => {
  runSequence('remove-ds-store', ['index', 'photos'], 'prime-posts', 'copy-mh', cb);
});

gulp.task('build', 'Run all site-generating tasks: sass, js, graphics, icons, htaccess then jekyll', (cb) => {
  runSequence(['sass', 'js', 'graphics', 'icons', 'htaccess'], 'jekyll', cb);
});

/*
             _             _          __  __
  __ _ _   _| |_ __    ___| |_ _   _ / _|/ _|
 / _` | | | | | '_ \  / __| __| | | | |_| |_
| (_| | |_| | | |_) | \__ \ |_| |_| |  _|  _|
 \__, |\__,_|_| .__/  |___/\__|\__,_|_| |_|
 |___/        |_|
*/

gulp.task('default', false, ['help']);

gulp.task('watch', 'Watch-run sass, jekyll, js, graphics, and icons tasks', () => {
  gulp.watch('./_sass/**/*.scss', ['sass']);
  gulp.watch(['./*.*', './**/*.html', './**/*.yml', './**/*.markdown', './**/.*.md', '!./**'], ['jekyll']);
  gulp.watch(['./**/*.js', '!./**', '!./node_modules/**'], ['js']);
  gulp.watch(['./_gfx/**/*.*'], ['graphics']);
  gulp.watch(['./_icons/**/*.*'], ['icons']);
});
