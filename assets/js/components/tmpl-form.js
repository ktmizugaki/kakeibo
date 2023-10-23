function TmplForm(params) {
  this.dataStore = params.dataStore;
  this.kamokus = this.dataStore.kamokus;
  this.value = ko.observable(params.value());
  this.list = ko.observable(new List(this.value().json()));
  this.items = ko.computed(this.items.bind(this));
  this.is_saving = ko.observable(false);
  this.onSave = params.onSave;
  this.onDel = params.onDel;
  this.save = this.save.bind(this);
  this.del = this.del.bind(this);
}
TmplForm.prototype.items = function() {
  var dataStore = this.dataStore;
  var list = this.list();
  if (!list) return [];
  return list.items().map(function(item) {
    return new ItemInputProxy(item, dataStore);
  });
};
TmplForm.prototype.save = function() {
  var self = this;
  var value = self.value();
  var list = self.list();
  if (!value) return;
  var date = value.date() || undefined;
  if (date != undefined && date != '') {
    var datenum = parseInt(date);
    if (date != 'E' && (!date.match(/^[0-9]+$/) || datenum < 1 || datenum > 31)) {
      console.error('invalid date for template', date);
      value.errors({date: ['is not valid']});
      self.is_saving(false);
      return;
    }
  }
  self.is_saving(true);
  var items = list.toParams().items;
  value.json({date:date,items:items});
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
TmplForm.prototype.del = function() {
  var self = this;
  var value = self.value();
  if (!value || !value.id() || self.is_saving()) return;
  if (!confirm("ひな型「"+value.name()+"」を削除しますか？")) {
    return;
  }
  self.is_saving(true);
  value.destroy().then(function(tmpl) {
    self.dataStore.removeTmpl(value);
    self.is_saving(false);
    if (typeof self.onDel === 'function') {
      self.onDel(value);
    }
  }).catch(function(err) {
    if (value != self.value()) return;
    self.is_saving(false);
    if (err.errors) {
    } else if (err && err.status == 404) {
      self.dataStore.removeTmpl(value);
      if (typeof self.onDel === 'function') {
        self.onDel(value);
      }
    } else {
      alert("エラーが発生しました");
    }
  });
};
ko.components.register("tmpl-form", {
  viewModel: TmplForm,
  template: { fetch: "html/tmpl-form.html" }
});
ko.components.get("tmpl-form", function(res){});
