function CalendarDialog(dialogManager, options) {
  var dialog = {
    template:"template-datepick-dialog",
    id: "date-dialog",
    title: options.title || "日付選択",
    params: {
      date: ko.observable(options.date()||date2str(new Date())),
      mode: options.mode,
    },
    target_date: options.date,
  };
  dialog.data = dialog;
  dialog.apply = function() {
    if (dialog.target_date) {
      dialog.target_date(dialog.params.date());
    }
    if (dialog.handle) {
      dialogManager.close(dialog.handle);
    }
  };
  dialog.cancel = function() {
    if (dialog.handle) {
      dialogManager.close(dialog.handle);
    }
  };
  dialog.onDialogClose = function(handle) {
    if (dialog.handle != handle) {
      return;
    }
    dialog.handle = null;
    dialog.target_date = null;
  };
  var handle = dialogManager.open(dialog);
  if (!handle) {
    return false;
  }
  dialog.handle = handle;
  return dialog;
}
