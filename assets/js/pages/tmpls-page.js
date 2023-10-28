function TmplDialog(dialogManager, dataStore) {
  this.component = "tmpl-form";
  this.id = "tmpl-dialog";
  this.title = ko.pureComputed(this.title.bind(this));
  this.data = {
    dataStore: dataStore,
    value: ko.observable(null),
    onSave: this.close.bind(this),
    onDel: this.close.bind(this),
  };
  this.handle = null;
  this.dialogManager = dialogManager;
  this.onDialogOpen = this.onDialogOpen.bind(this);
  this.onDialogClose = this.onDialogClose.bind(this);
}
TmplDialog.prototype.title = function() {
  var value = this.data.value();
  return value? value.id()? "ひな型の更新": "ひな型の追加": null;
};
TmplDialog.prototype.open = function(tmpl) {
  var handle = this.dialogManager.open(this);
  if (!handle) {
    return false;
  }
  this.handle = handle;
  var value = new Template(tmpl&&tmpl.toObject());
  value.date = ko.observable(value.json().date);
  this.data.value(value);
  return true;
};
TmplDialog.prototype.close = function() {
  if (this.handle) {
    this.dialogManager.close(this.handle);
  }
};
TmplDialog.prototype.onDialogOpen = function(handle, element) {
  element.querySelector("select, input").focus();
};
TmplDialog.prototype.onDialogClose = function(handle) {
  if (this.handle != handle) {
    return;
  }
  this.data.value(null);
  this.handle = null;
};

function TmplsPage(tabbar, dialogManager, dataStore) {
  this.tabInfo = {label:"ひな型",component:"tmpls-page",data:this};
  this.tmpls = dataStore.tmpls;
  this.loadAll = function() {
    return Promise.all([Template.all()]).then(function(res){
      dataStore.setTmpls(res[0]());
    });
  };

  var dialog = new TmplDialog(dialogManager, dataStore);
  this.addTmpl = function() {
    return dialog.open();
  };
  this.editTmpl = function() {
    return dialog.open(this);
  };
}

ko.components.register("tmpls-page", {
  template: { fetch: "html/tmpls-page.html" }
});
