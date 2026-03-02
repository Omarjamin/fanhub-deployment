class SPA {
  /**
   * @typedef {{
   *  key: string | RegExp,
   *  callback: VoidFunction,
   * }} Route
   *
   * @type {Route[]}
   *
   */
  routes = [];

  /**
   * New SPA
   *
   * @typedef {{
   *    root: NodeElement,
   *    defaultRoute: VoidFunction,
   * }} SPAConfiguration
   *
   * @param {SPAConfiguration}
   *
   */
  constructor(config = {}) {
    this.context = {
      root: config?.root || document.getElementById('app'),
    };

    this.defaultRoute = {
      key: '*',
      callback: (config?.defaultRoute || (() => { })).bind(this.context),
    };
  }

  /**
   * Register route
   *
   * @param {string|RegExp} path URL path
   * @param {VoidFunction} cb Callback function
   */
  add(path, cb) {
    this.routes.push({
      key: path,
      callback: cb.bind(this.context),
    });
  }

  /**
   * Get route
   *
   * @param {string} path Get route callback using path
   * @returns {Route} Route
   *
   */
  get(path) {
    const route = this.routes.find(r => (r.key instanceof RegExp && r.key.test(path)) || r.key === path);
    return route || this.defaultRoute;
  }

  /**
   * Execute route
   *
   * @param {string} path Window location pathname
   *
   */
  execute(path) {
    const route = this.get(path);
    let params;

    if (route?.key && route?.key instanceof RegExp) {
      params = route.key.exec(window.location.pathname);

      if (params?.groups && Object.keys(params?.groups).length > 0) {
        params = params.groups;
      } else {
        params = Array.from(params);
        params?.shift();
      }
    }

    route?.callback(params);
  }

  /**
   * Set default callback
   *
   * @param {VoidFunction} cb Route function 
   *
   */
  setDefault(cb) {
    this.defaultRoute = {
      key: '*',
      callback: cb,
    };
  }

  /**
   * Register events
   *
   * @returns {void}
   *
   */
  handleRouteChanges() {
    window.addEventListener('popstate', () => {
      this.execute(window.location.pathname);
    });

    const observer = new MutationObserver((mutationList) => {
      mutationList.forEach((mutation) => {
        mutation?.addedNodes?.forEach(e => {
          if (e.nodeName.toLowerCase() === 'a') {
            e.addEventListener('click', (e) => {
              try {
                const targetUrl = new URL(e.target.href);
                const target = e.target.getAttribute('target') || '_self';

                if (targetUrl.origin === window.location.origin && target === '_self') {
                  e.preventDefault();
                  history.pushState({}, '', e.target.href);
                  this.execute(window.location.pathname);

                  // simulate scroll into
                  if (targetUrl.hash) {
                    const focusElem = document.querySelector(targetUrl.hash);
                    focusElem && setTimeout(focusElem.scrollIntoView(
                      { behavior: 'smooth', block: 'end', inline: 'nearest' }
                    ), 500);
                  }
                }
              } catch (err) {
                console.error('spa: cannot parse target href', err);
              }
            })
          }
        })
      })
    });

    observer.observe(document, { attributes: true, childList: true, subtree: true });

    this.execute(window.location.pathname);
  }
}

export default SPA;
