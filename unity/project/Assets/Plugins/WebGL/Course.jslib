mergeInto(LibraryManager.library, {
  CourseSnapshot: function (json) {
    window.courseSnapshot = JSON.parse(UTF8ToString(json));
    window.dispatchEvent(new CustomEvent('course-snapshot', { detail: window.courseSnapshot }));
  }
});
