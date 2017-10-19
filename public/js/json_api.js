var json_api = (function(_global) {
  var base_uri = location.pathname.replace(/\/[^\/]+$/, "");
  function make_body(values) {
    var key;
    var params = [];
    for (key in values) {
      if (values.hasOwnProperty(key)) {
        params.push(encodeURIComponent(key)+"="+encodeURIComponent(values[key]));
      }
    }
    return params.join("&");
  }
  function check_response(res) {
    return res.json().then(function(json) {
      if (!res.ok || !json || json.error) {
        return Promise.reject(json || {status:500,error:"unknown error"});
      } else {
        return Promise.resolve(json);
      }
    });
  }
  function fetch_with_path(path, method, _method, object) {
    var init = { method: method, credentials: "include" };
    if (method != "GET") {
      var body = {};
      if (_method) body._method = _method;
      if (object) body.json = JSON.stringify(object);
      init.headers = {"Content-Type": "application/x-www-form-urlencoded"};
      init.body = make_body(body);
    }
    return fetch(base_uri+path, init).then(check_response);
  }
  return {
    "get": function json_get(path, query) {
      if (query) path += "?"+make_body(query);
      return fetch_with_path(path, "GET");
    },
    "post": function json_post(path, object) {
      return fetch_with_path(path, "POST", undefined, object);
    },
    "put": function json_put(path, object) {
      return fetch_with_path(path, "POST", "PUT", object);
    },
    "del": function json_del(path) {
      return fetch_with_path(path, "POST", "DELETE");
    },
  };
})(this);
var params = (function(_global) {
  var path = ko.observable(""), query = ko.observableArray([]);
  function parseFragment() {
    var arr = location.hash.match(/#([-a-z0-9\/]+)(?:\?(.*))?/);
    if (arr) {
      path(arr[1]);
      if (arr[2] !== undefined) {
        query(arr[2].split('&').map(function(p) {
          var q = p.split("=");
          if (q.length == 2) {
            return [q[0], q[1]];
          }
        }));
      }
    }
  }
  function updateFragment() {
    var f = "", q;
    if (path()) {
      f += path();
    }
    q = query().map(function(p) { if (p[1] !== undefined) return p[0]+"="+p[1]; }).join('&');
    if (q) {
      f += '?'+q;
    }
    if (f) {
      f = '#'+f;
    }
    if (f != location.hash) {
      location.hash = f;
    }
  }
  parseFragment();
  path.subscribe(updateFragment);
  query.subscribe(updateFragment);
  window.addEventListener("hashchange", function() {
    parseFragment();
  });
  return {
    path: path,
    query: query,
    get: function(name) {
      var ret = undefined;
      query().forEach(function(p) {
        if (p[0] == name) ret = p[1];
      });
      return ret;
    },
    getAll: function(name) {
      var ret = [];
      query().forEach(function(p) {
        if (p[0] == name) ret.push(q[1]);
      });
      return ret;
    },
    add: function(name, value) {
      query.push([name, value]);
    },
    set: function(name, value) {
      var initial = true, notify = false;
      query.remove(function(p) {
        if (p[0] == name) {
          if (initial) {
            initial = false;
            notify = p[1] == value;
            p[1] = value;
            return false;
          } else {
            notify = false;
            return true;
          }
        } else {
          return false;
        }
      });
      if (initial) {
        query.push([name, value]);
      } else if (notify) {
        query.notifySubscribers(query());
      }
    },
    remove: function(name, value) {
      query.remove(function(p) { return p[0] == name });
    },
  };
})(this);
