mergeInto(LibraryManager.library, {
  CourseSyncSave: function(receiver) {
    var target = UTF8ToString(receiver);
    FS.syncfs(false, function(error) {
      Module.SendMessage(target, 'OnStorageSync', error ? String(error.message || error) : 'OK');
    });
  }
});
