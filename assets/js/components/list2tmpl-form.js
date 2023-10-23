function ListToTmplForm(params) {
  this.dialogManager = params.dialogManager;
  this.dataStore = params.dataStore;
  this.is_saving = ko.observable(false);
  this.value = ko.observable(params.value());
  this.list = params.list;
  this.onSave = params.onSave;
  this.save = this.save.bind(this);
}
ListToTmplForm.prototype.save = function() {
  var self = this;
  var value = self.value();
  var list = self.list;
  if (!value) return;
  self.is_saving(true);
  if (list.items) {
    list.items.forEach(function(item) {
      delete item.list_id;
      delete item.dir;
      delete item.amount;
    });
    value.json({items:list.items});
  }
  value.save().then(function(tmpl) {
    self.dataStore.pushTmpl(tmpl);
    self.is_saving(false);
    if (typeof self.onSave === 'function') {
      self.onSave(value);
    }
  }).catch(function(err) {
    self.is_saving(false);
    if (err.errors) {
    } else {
      alert("エラーが発生しました");
    }
  });
};
ko.components.register("list2tmpl-form", {
  viewModel: ListToTmplForm,
  template: { fetch: "html/list2tmpl-form.html" }
});
ko.components.get("list2tmpl-form", function(res){});
