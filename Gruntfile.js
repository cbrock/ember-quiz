module.exports = function(grunt) {

  grunt.initConfig({
    jshint: {
      all: ['js/app.js'],
      options: {
        jshintrc: '.jshintrc'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.registerTask('default', 'jshint');

};