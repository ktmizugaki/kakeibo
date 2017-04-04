var page = (function(_global) {
  ko.options.deferUpdates = true;
  var tab = koTabbar({});
  var dialogManager = koDialogManager({});
  var date = ko.observable(params.get("date") || month2str(new Date()));
  date.subscribe(function(date) { params.set("date", date); });
  params.query.subscribe(function() { var d = params.get("date"); if (d) date(d); });
  var kamokus = new KamokuManager(tab, dialogManager);
  var tmpls = new TmplManager(tab, dialogManager, kamokus);
  var lists = new ListManager(tab, dialogManager, kamokus, tmpls, date);
  var summary = new SummaryManager(tab, dialogManager, kamokus, date);
  var bykamoku = new ByKamokuManager(tab, dialogManager, kamokus, date);
  var data = {
    tab: tab,
    dialogManager: dialogManager,
  };
  var initial = true;

  return {
    init: function page_init() {
      if (initial) {
        ko.applyBindings(data, document.body);
        data.tab.selected.subscribe(function(tab) {
          if (tab) params.path(tab);
          page.setTitleInfo();
        });
        params.path.subscribe(function(path) { tab.setSelected(path); });
      }
      initial = false;
      data.tab.selected(null);
      Promise.all([kamokus.loadAll(), tmpls.loadAll()]).then(function(res){
        data.tab.addTab(ko.utils.extend(kamokus.tabInfo, {name:"kamokus"}));
        data.tab.addTab(ko.utils.extend(tmpls.tabInfo, {name:"tmpls"}));
        data.tab.addTab(ko.utils.extend(lists.tabInfo, {name:"lists"}));
        data.tab.addTab(ko.utils.extend(summary.tabInfo, {name:"summary"}));
        data.tab.addTab(ko.utils.extend(bykamoku.tabInfo, {name:"bykamoku"}));
        if (!data.tab.setSelected(params.path())) {
          data.tab.selected("kamokus");
        }
      }).catch(function(err){
        alert("データのロードエラーです");
      });
    },
    setTitleInfo: function(info) {
      var tabName = tab.current().label;
      document.title = tabName + (info? "#"+info:"") + ' - ' + '家計簿';
    }
  };
})(this);
