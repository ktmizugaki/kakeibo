function CarryOverForm(params) {
  this.dataStore = params.dataStore;
  this.is_saving = ko.observable(false);
  this.value = ko.observable(params.value());
  this.onSave = params.onSave;
  this.save = this.save.bind(this);
}
CarryOverForm.prototype.save = function() {
  var self = this;
  var dataStore = this.dataStore;
  var value = self.value();
  if (!value) return;
  self.is_saving(true);
  value.save().then(function(list) {
    self.is_saving(false);
    list.items().forEach(function(item) {
      item.kamoku = dataStore.computedKamoku(item.kamoku_id);
    });
    if (typeof self.onSave === 'function') {
      self.onSave(list);
    }
  }).catch(function(err) {
    self.is_saving(false);
    if (err.errors) {
    } else {
      alert("エラーが発生しました");
    }
  });
};
ko.components.register("carryover-form", {
  viewModel: CarryOverForm,
  template: { fetch: "html/carryover-form.html" }
});
ko.components.get("carryover-form", function(res){});
