function KamokuForm(params) {
  this.dataStore = params.dataStore;
  this.value = ko.observable(params.value());
  this.is_saving = ko.observable(false);
  this.onSave = params.onSave;
  this.onDel = params.onDel;
  this.save = this.save.bind(this);
  this.del = this.del.bind(this);
};
KamokuForm.prototype.save = function() {
  var self = this;
  var value = self.value();
  self.is_saving(true);
  value.save().then(function(kamoku) {
    self.dataStore.pushKamoku(kamoku);
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
KamokuForm.prototype.del = function() {
  var self = this;
  var value = self.value();
  if (!value || !value.id() || self.is_saving()) return;
  if (!confirm("「"+value.code()+" "+value.name()+"」を削除しますか？")) {
    return;
  }
  self.is_saving(true);
  value = self.dataStore.kamokuMap()[value.id()];
  value.destroy().then(function(kamoku) {
    self.dataStore.removeKamoku(value);
    self.is_saving(false);
    if (typeof self.onDel === 'function') {
      self.onDel(value);
    }
  }).catch(function(err) {
    self.is_saving(false);
    if (err && err.status == 404) {
      self.dataStore.removeKamoku(value);
      if (typeof self.onDel === 'function') {
        self.onDel(value);
      }
    } else {
      alert("エラーが発生しました");
    }
  });
};
ko.components.register("kamoku-form", {
  viewModel: KamokuForm,
  template: { fetch: "html/kamoku-form.html" }
});
ko.components.get("kamoku-form", function(res){});
