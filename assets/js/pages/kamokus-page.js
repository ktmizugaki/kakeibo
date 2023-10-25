function KamokuDialog(dialogManager, dataStore) {
  this.template = "template-kamoku-form";
  this.id = "kamoku-dialog";
  this.title = ko.pureComputed(this.title.bind(this));
  this.data = {
    dataStore: dataStore,
    value: ko.observable(null),
    onSave: this.close.bind(this),
    onDel: this.close.bind(this),
  };
  this.handle = null;
  this.dialogManager = dialogManager;
  this.dataStore = dataStore;
  this.onDialogOpen = this.onDialogOpen.bind(this);
  this.onDialogClose = this.onDialogClose.bind(this);
}
KamokuDialog.prototype.title = function() {
  var value = this.data.value();
  return value? value.id()? "勘定科目の更新": "勘定科目の作成": null;
};
KamokuDialog.prototype.open = function(kamoku) {
  var handle = this.dialogManager.open(this);
  if (!handle) {
    return false;
  }
  this.handle = handle;
  var value = new Kamoku(kamoku&&kamoku.toObject());
  value.category = this.dataStore.computedCategory(value.category_id);
  this.data.value(value);
  return true;
};
KamokuDialog.prototype.close = function() {
  if (this.handle) {
    this.dialogManager.close(this.handle);
  }
};
KamokuDialog.prototype.onDialogOpen = function(handle, element) {
  element.querySelector("select, input").focus();
};
KamokuDialog.prototype.onDialogClose = function(handle) {
  if (this.handle != handle) {
    return;
  }
  this.data.value(null);
  this.handle = null;
};

function KamokusPage(tabbar, dialogManager, dataStore) {
  this.tabInfo = {label:"勘定科目",template:"template-kamokus-page",data:this};
  this.categories = dataStore.categories;
  this.kamokus = dataStore.kamokus;
  this.loadAll = function() {
    return Promise.all([Category.all(), Kamoku.all()]).then(function(res){
      dataStore.setCategories(res[0]());
      dataStore.setKamokus(res[1]());
    });
  };

  var dialog = new KamokuDialog(dialogManager, dataStore);
  this.addKamoku = function() {
    return dialog.open();
  };
  this.editKamoku = function(kamoku) {
    return dialog.open(kamoku);
  };
}

ko.components.register("kamokus-page", {
  template: { fetch: "html/kamokus-page.html" }
});
